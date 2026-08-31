import { spawn, execFileSync } from "node:child_process";
import { homedir, tmpdir } from "node:os";
import {
  statSync,
  readdirSync,
  existsSync,
  createReadStream,
  readFileSync,
  rmSync,
  mkdtempSync,
} from "node:fs";
import { createHash } from "node:crypto";
import { join, resolve, relative, posix } from "node:path";
import { logger, spinner } from "./logger.mjs";

/** 远端保留的 release 版本数（超出自动清理，保留用于回滚） */
const KEEP_RELEASES = 5;

/**
 * 把 "~" 或 "~/xxx" 展开成绝对路径。
 */
function expandHomePath(p) {
  if (!p) return p;
  if (p === "~") return homedir();
  if (p.startsWith("~/") || p.startsWith("~\\")) {
    const sep = p.includes("\\") ? "\\" : "/";
    return homedir() + sep + p.slice(2);
  }
  return p;
}

/**
 * 格式化字节为人类可读。
 */
function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ============================================================================
// release 版本化管线（Capistrano 风格：releases/ + current 软链 + 回滚）
//
// 设计要点：
// - 上传的是单个 tarball 到 incoming/ 暂存区，断连只会留下截断文件，可重跑
// - 远端校验 sha256 通过后才解压到 releases/<ts>-<sha>/（fail-closed）
// - 用 mv -Tf 原子切换 current 软链（单次 rename(2)，零窗口）
// - 保留最近 KEEP_RELEASES 个版本用于回滚
// ============================================================================

/** 生成 release 版本名：<时间戳(精确到秒)>-<git短sha> */
export function makeReleaseName() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  const ts =
    `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-` +
    `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  let sha = "unknown";
  try {
    // 从 monorepo 根拿 git 短 sha（也可能被 -w 从 app 目录转发，向上找到 .git）
    sha = execFileSync("git", ["rev-parse", "--short", "HEAD"], {
      encoding: "utf8",
      cwd: findGitRoot(process.cwd()),
    }).trim();
  } catch {
    // 非 git 环境时回退，保证唯一性由时间戳承担
  }
  return `${ts}-${sha}`;
}

/** 从当前目录向上找 git 仓库根，找不到返回原目录 */
function findGitRoot(startDir) {
  let dir = startDir;
  for (let i = 0; i < 10; i++) {
    if (existsSync(join(dir, ".git"))) return dir;
    const parent = resolve(dir, "..");
    if (parent === dir) break;
    dir = parent;
  }
  return startDir;
}

/**
 * 从 HTML 标签属性串中提取指定属性值（兼容双引号 / 单引号 / 无引号三种写法）。
 *
 * 属性名前要求行首或空白（而非 \b 单词边界）：\b 会把 data-src / xlink:href 中的
 * src / href 误当真实属性，导致懒加载占位图等无关 URL 被纳入校验。
 */
function pickAttr(attrs, name) {
  const re = new RegExp(
    "(?:^|\\s)" + name + "\\s*=\\s*(?:\"([^\"]*)\"|'([^']*)'|([^\\s\"'=<>`]+))"
  );
  const m = attrs.match(re);
  if (!m) return null;
  return m[1] ?? m[2] ?? m[3] ?? null;
}

/**
 * 校验 base 目录下的相对路径存在，且各段大小写与磁盘目录项完全一致。
 *
 * 背景：发布机多为 Windows（NTFS 大小写不敏感），线上 nginx/Linux 大小写敏感。
 * 引用 /assets/app.js 而磁盘是 Assets/app.js 时，existsSync 本地放行、线上 404。
 *
 * 只校验 base 之下的段：base 自身（可能是含 8.3 短名如 ADMINI~1 的临时目录或仓库
 * 路径）不参与比对——readdirSync 返回长文件名，短名前缀必然对不上，会把合法产物
 * 误判成缺失。
 */
function existsUnderExactCase(base, segs) {
  const full = join(base, ...segs);
  if (!existsSync(full)) return false;
  try {
    let cur = base;
    for (const seg of segs) {
      if (!readdirSync(cur).includes(seg)) return false;
      cur = join(cur, seg);
    }
    return true;
  } catch {
    // 目录不可读等异常时退化为宽松判断（不因检查工具自身故障阻断部署）
    return true;
  }
}

/**
 * 发布前产物冒烟检查：解析 index.html 引用的本地资源，校验文件在产物目录真实存在。
 *
 * 背景：构建成功 ≠ 页面能渲染。base path 配错、public 目录漏拷、打包不完整等
 * 问题 build 阶段不会报错，上线后白屏。本检查在打包前拦截。
 *
 * 资源 URL → 本地文件的映射规则（与 nginx 部署方式对应）：
 *   - 域名根部署：引用 /assets/x.js → 产物 <outDir>/assets/x.js（原样映射）
 *   - 子路径部署：引用 /h5/assets/x.js → 产物 <outDir>/assets/x.js（剥离 base 前缀，
 *     对应 nginx location /h5/ alias 到 deployPath 根）
 *   两种映射任一命中即通过。
 *
 * 校验分级：
 *   - 强校验（缺失抛错阻断部署）：script[src]、link[rel=stylesheet|modulepreload]
 *   - 弱校验（仅警告不阻断）：其余 link href（favicon / manifest 等，缺失只影响图标）
 *   - 跳过：外链（http:// https:// // data:）、内联资源、data-* 等伪属性
 *
 * 与线上 nginx 行为对齐的细节：
 *   - 存在性检查区分大小写（发布机 Windows 不敏感、线上 Linux 敏感）
 *   - URL 编码路径先解码再匹配（%20 / 中文等，nginx 线上是解码后找文件）
 *
 * base 前缀软检查：若所有命中都依赖「剥离第一段」（说明构建带 base 前缀），
 * 且该前缀与 deployPath 末段不一致，打印警告提醒人工核对 nginx location 配置。
 *
 * @param {string} absOutDir - 产物目录绝对路径（index.html 所在处）
 * @param {string} deployPath - 远端部署根路径（用于 base 前缀一致性提示）
 * @returns {{ total: number, basePrefix: string | null }}
 */
export function verifyDistAssets(absOutDir, deployPath) {
  const indexPath = join(absOutDir, "index.html");
  if (!existsSync(indexPath)) {
    // 与远端 test -f index.html 兜底保持一致，但提前到本地更早失败
    throw new Error(`产物缺少 index.html: ${indexPath}`);
  }
  const html = readFileSync(indexPath, "utf8");

  // ---- 提取资源引用 ----
  /** @type {{ url: string, strong: boolean }[]} */
  const refs = [];
  for (const m of html.matchAll(/<script\b([^>]*)>/g)) {
    const src = pickAttr(m[1], "src");
    // 外部脚本（src 指向 js 文件）做强校验；无 src 的内联 script 跳过
    if (src) refs.push({ url: src, strong: true });
  }
  for (const m of html.matchAll(/<link\b([^>]*)>/g)) {
    const href = pickAttr(m[1], "href");
    const rel = (pickAttr(m[1], "rel") || "").toLowerCase();
    if (!href) continue;
    // 样式与预加载模块缺失会白屏，强校验；favicon / manifest 等只警告
    const strong = /(^|\s)(stylesheet|modulepreload)(\s|$)/.test(rel);
    refs.push({ url: href, strong });
  }

  // ---- 逐个映射到本地文件 ----
  /**
   * URL 路径 → 候选"相对 absOutDir 的段数组"列表。
   * 绝对路径给两个候选：原样映射（域名根部署）+ 剥离首段映射（子路径部署）；
   * 相对路径解析为相对 absOutDir 的段（可能含 .. 表示逃逸出产物目录）。
   */
  const candidatesFor = (p) => {
    if (!p.startsWith("/")) {
      const rel = relative(absOutDir, resolve(absOutDir, p));
      return [rel.split(/[\\/]/).filter(Boolean)];
    }
    const segs = p.slice(1).split("/").filter(Boolean);
    const list = [segs];
    if (segs.length > 1) list.push(segs.slice(1));
    return list;
  };

  const missingStrong = [];
  const missingWeak = [];
  /** 触发"剥离首段"才命中的首段集合（用于推断 base 前缀） */
  const strippedPrefixes = new Set();
  let checked = 0;

  for (const { url, strong } of refs) {
    // 跳过外链（https?:// 与协议相对 //）和 data URI
    if (/^(?:https?:)?\/\//.test(url) || url.startsWith("data:")) continue;
    // 去掉 query / hash 后缀（?v=123 / #fragment）
    const clean = url.split(/[?#]/)[0];
    if (!clean) continue;
    checked += 1;

    // nginx 线上按解码后的路径找文件，含 %20/%E4 等编码的资源要解码后再试一次
    let decoded = null;
    try {
      decoded = decodeURIComponent(clean);
    } catch {
      // 非法编码序列（如孤立的 %），保留原始路径继续
    }

    const candidates = candidatesFor(clean);
    if (decoded && decoded !== clean)
      candidates.push(...candidatesFor(decoded));

    const hitIdx = candidates.findIndex((segs) =>
      // 含 .. 的路径（相对引用逃逸出产物目录）无法逐段校验，退化为宽松判断
      segs.includes("..")
        ? existsSync(join(absOutDir, ...segs))
        : existsUnderExactCase(absOutDir, segs)
    );
    if (hitIdx === -1) {
      (strong ? missingStrong : missingWeak).push(url);
    } else if (hitIdx % 2 === 1) {
      // 候选按 [原样, 剥离首段, (解码原样, 解码剥离)] 排列——奇数位命中
      // 说明是靠"剥离首段"才命中 → 首段即 base 前缀
      strippedPrefixes.add(clean.slice(1).split("/")[0]);
    }
  }

  // ---- 强校验失败：列出缺失清单后抛错 ----
  if (missingStrong.length > 0) {
    const sample = missingStrong
      .slice(0, 10)
      .map((u) => `  - ${u}`)
      .join("\n");
    const more =
      missingStrong.length > 10
        ? `\n  ...（共 ${missingStrong.length} 个）`
        : "";
    throw new Error(
      `[SMOKE] index.html 引用的资源在产物中不存在（上线会白屏/404），已阻断部署：\n${sample}${more}\n` +
        `常见原因：vite 的 base 配错、public 目录漏拷、产物目录不完整。`
    );
  }
  for (const u of missingWeak) {
    logger.warn(`[SMOKE] 非关键资源缺失（不影响页面渲染，仅提示）: ${u}`);
  }

  // ---- base 前缀一致性软检查 ----
  let basePrefix = null;
  if (strippedPrefixes.size === 1) {
    basePrefix = [...strippedPrefixes][0];
    const lastSeg = deployPath.split("/").filter(Boolean).pop() || "";
    if (lastSeg && basePrefix.toLowerCase() !== lastSeg.toLowerCase()) {
      logger.warn(
        `[SMOKE] 构建 base 前缀 "/${basePrefix}/" 与 deployPath 末段 "${lastSeg}" 不一致，` +
          `请人工核对 nginx location 与构建 base 配置是否匹配。`
      );
    }
  }

  logger.success(`[SMOKE] index.html 资源检查通过（${checked} 个本地引用）`);
  return { total: checked, basePrefix };
}

/**
 * 在临时目录把产物打包成单个 .tar.gz，返回 { tarballPath, name, sha256, tmpDir }。
 * 文件名用 git sha 而非时间戳，确保同代码重跑时远端命中同名文件 → 断点续传生效。
 *
 * 异步实现（spawn）：tar 压缩期间事件循环保持运转，spinner 才能持续刷新。
 */
async function packTarball(absOutDir, release) {
  const tmpDir = mkdtempSync(join(tmpdir(), "ship-"));
  // 从 release 名提取 sha（如 20260804-143952-2da40ca → 2da40ca）
  const sha = release.split("-").pop();
  const name = `dist-${sha}.tar.gz`;
  const tarballPath = join(tmpDir, name);

  const args = ["-czf", tarballPath, "-C", absOutDir, "."];
  spinner.start(`[PACK] 正在打包 ${name} ...`);
  const startMs = Date.now();
  await new Promise((resolve, reject) => {
    // tar 正常无输出，stderr 走 pipe 收集（inherit 会和 spinner 单行刷新打架）
    const proc = spawn("tar", args, { stdio: ["ignore", "ignore", "pipe"] });
    let errText = "";
    proc.stderr?.on("data", (d) => (errText += d.toString()));
    proc.on("exit", (code) => {
      if (code === 0) resolve();
      else
        reject(
          new Error(`本地 tar 打包失败，退出码 ${code}: ${errText.trim()}`)
        );
    });
    proc.on("error", (err) =>
      reject(new Error(`无法启动 tar: ${err.message}`))
    );
  });
  spinner.succeed(
    `[PACK] ${name} 打包完成（${((Date.now() - startMs) / 1000).toFixed(1)}s）`
  );

  return { tarballPath, name, sha256: computeSha256(tarballPath), tmpDir };
}

/** 兼容 Windows/Linux 的 sha256 计算（十六进制），与远端 sha256sum 格式一致 */
function computeSha256(filePath) {
  return createHash("sha256").update(readFileSync(filePath)).digest("hex");
}

/** 构造 ssh 基础参数数组 */
function buildSshArgs(target, extraOpts = []) {
  return [
    "-i",
    expandHomePath(target.sshKeyPath),
    "-p",
    String(target.port),
    "-o",
    "StrictHostKeyChecking=no",
    "-o",
    "UserKnownHostsFile=/dev/null",
    "-o",
    "ServerAliveInterval=30",
    "-o",
    "ServerAliveCountMax=5",
    "-o",
    "ConnectTimeout=10",
    "-o",
    "ConnectionAttempts=3",
    ...extraOpts,
  ];
}

/** 远端执行单条命令，返回 stdout 字符串（失败抛错） */
function sshExec(target, command) {
  const proc = spawn("ssh", [
    ...buildSshArgs(target),
    `${target.user}@${target.host}`,
    command,
  ]);
  let stdout = "";
  let stderr = "";
  return new Promise((resolveOut, reject) => {
    proc.stdout.on("data", (d) => (stdout += d.toString()));
    proc.stderr.on("data", (d) => (stderr += d.toString()));
    proc.on("exit", (code) => {
      if (code === 0) resolveOut(stdout.trim());
      else reject(new Error(`ssh 失败（exit ${code}）: ${stderr.trim()}`));
    });
    proc.on("error", (err) =>
      reject(new Error(`无法启动 ssh: ${err.message}`))
    );
  });
}

/** 列出远端已发布的 release 版本（按时间倒序） */
export async function listReleases(target) {
  const out = await sshExec(
    target,
    `ls -1t "${target.deployPath}/releases/" 2>/dev/null || true`
  );
  return out ? out.split("\n").filter(Boolean) : [];
}

/** 读取远端 current 软链当前指向的 release 名（无则返回 null） */
export async function getCurrentRelease(target) {
  try {
    const out = await sshExec(
      target,
      `basename "$(readlink "${target.deployPath}/current" 2>/dev/null)" 2>/dev/null || true`
    );
    return out || null;
  } catch {
    return null;
  }
}

/**
 * release 部署：上传 tarball → 远端校验 → 解压到 releases/ → 原子切换 current。
 *
 * 部署命令（远端一步完成，SSH 断连后远端脚本仍会跑完）:
 *   bash -s <<'EOF'
 *     set -euo pipefail
 *     cd <root>/incoming
 *     echo "<sha256>  <name>" | sha256sum -c -        # 完整性校验，fail-closed
 *     rm -rf <root>/releases/<rel>
 *     mkdir -p <root>/releases/<rel>
 *     tar -xzf <name> -C <root>/releases/<rel>
 *     test -f <root>/releases/<rel>/index.html          # 业务级兜底
 *     ln -s releases/<rel> <root>/.current.tmp
 *     mv -Tf <root>/.current.tmp <root>/current         # 原子切换
 *     cd <root>/releases && ls -1t | tail -n +6 | xargs -d '\n' -r rm -rf --
 *     rm -f <root>/incoming/<name> <root>/incoming/<name>.sha256
 *   EOF
 *
 * @param {object} target - validateTarget 返回的配置（deployPath 为应用根）
 * @param {string} outDir - 本地产物路径
 * @param {string} release - release 版本名
 * @param {boolean} [dryRun] - 仅打印计划
 */
export async function deployToServerRelease(
  target,
  outDir,
  release,
  dryRun = false
) {
  const absOutDir = resolve(process.cwd(), outDir);
  const root = target.deployPath;

  if (!existsSync(absOutDir)) {
    throw new Error(`产物目录不存在: ${absOutDir}`);
  }
  if (!/^[A-Za-z0-9._-]+$/.test(release)) {
    throw new Error(`非法 release 名称: ${release}`);
  }

  // ---- Step 0: 产物冒烟检查（index.html 资源引用完整性，防止上线白屏）----
  verifyDistAssets(absOutDir, root);

  // ---- Step 1: 本地打包（packTarball 内部自带 spinner）----
  const { tarballPath, name, sha256, tmpDir } = await packTarball(
    absOutDir,
    release
  );
  const tarballSize = statSync(tarballPath).size;

  if (dryRun) {
    logger.info(
      `[DRY-RUN] 上传 ${name} (${formatBytes(tarballSize)}) → ${root}/incoming/`
    );
    logger.info(`[DRY-RUN] sha256=${sha256}`);
    logger.info(
      `[DRY-RUN] 远端: sha256sum -c → 解压到 releases/${release} → mv -Tf 切换 current`
    );
    rmSync(tmpDir, { recursive: true, force: true });
    return { release, current: `${root}/current` };
  }

  try {
    // ---- Step 2: 上传到 incoming（断连可整体重跑，uploadFile 内实时刷新进度）----
    const start = Date.now();
    spinner.start(
      `[UPLOAD] ${name} (${formatBytes(tarballSize)}) → ${root}/incoming/`
    );
    await uploadFile(target, tarballPath, `${root}/incoming/${name}`);
    const upElapsed = ((Date.now() - start) / 1000).toFixed(1);
    spinner.succeed(
      `[UPLOAD] ${upElapsed}s | ${formatBytes(tarballSize)} → ${root}/incoming/`
    );

    // ---- Step 3: 远端校验 + 解压 + 原子切换（单次 SSH，断连不中断）----
    const tmpLink = `.current.tmp.${release}`;
    const remoteScript = `set -euo pipefail
cd "${root}/incoming"
echo "${sha256}  ${name}" | sha256sum -c - || { rm -f "${name}"; echo "SHA256 校验失败，已清理 incoming"; exit 1; }
rm -rf "${root}/releases/${release}"
mkdir -p "${root}/releases/${release}"
tar -xzf "${name}" -C "${root}/releases/${release}"
test -f "${root}/releases/${release}/index.html"
ln -s "releases/${release}" "${root}/${tmpLink}"
mv -Tf "${root}/${tmpLink}" "${root}/current"
cd "${root}/releases" && ls -1t | tail -n +${KEEP_RELEASES + 1} | xargs -d '\\n' -r rm -rf --
rm -f "${root}/incoming/${name}"
echo "REMOTE_DEPLOY_OK ${release}"`;

    spinner.start(
      `[REMOTE] 校验 sha256 → 解压 releases/${release} → 原子切换 current ...`
    );
    const remoteOut = await runRemoteScript(target, remoteScript);

    if (!remoteOut.includes("REMOTE_DEPLOY_OK")) {
      throw new Error(`远端部署脚本未确认成功: ${remoteOut}`);
    }
    spinner.succeed(`[DONE]  ${release} 已切换为 current`);
    return { release, current: `${root}/current` };
  } catch (err) {
    // 只停 spinner 不重复报错：错误统一由 deploy.mjs 顶层 catch 打印一次
    spinner.stop();
    throw err;
  } finally {
    // ---- Step 4: 清理本地临时 tarball 目录 ----
    try {
      rmSync(tmpDir, { recursive: true, force: true });
    } catch {
      // 临时目录清理失败不阻塞
    }
  }
}

/**
 * 回滚 current 软链到指定 release（原子，秒级）。
 * @param {object} target - 目标环境配置
 * @param {string} release - 目标 release 名
 */
export async function rollbackTo(target, release) {
  const root = target.deployPath;
  if (!/^[A-Za-z0-9._-]+$/.test(release)) {
    throw new Error(`非法 release 名称: ${release}`);
  }
  const tmpLink = `.current.tmp.${release}`;
  const script = `set -euo pipefail
test -d "${root}/releases/${release}" || { echo "release 不存在: ${release}" >&2; exit 1; }
ln -s "releases/${release}" "${root}/${tmpLink}"
mv -Tf "${root}/${tmpLink}" "${root}/current"
echo "REMOTE_ROLLBACK_OK ${release}"`;
  const out = await runRemoteScript(target, script);
  if (!out.includes("REMOTE_ROLLBACK_OK")) {
    throw new Error(`回滚未确认成功: ${out}`);
  }
  logger.success(`[ROLLBACK] current → releases/${release}`);
}

/**
 * 断点续传上传：先查远端已有字节数，从断点位置继续写入。
 *
 * - 远端已有完整文件 → 跳过上传
 * - 远端有部分文件 (0 < remoteSize < localSize) → Node createReadStream({start}) 跳过已传字节，
 *   远端用 `cat >>` 追加
 * - 远端无文件或异常 → 全新 `cat >` 覆盖
 *
 * 断连重跑时只传未完成部分，sha256 校验仍然兜底完整性。
 */
async function uploadFile(target, localPath, remotePath) {
  const localSize = statSync(localPath).size;

  // 查询远端已有字节数
  const remoteSize = await getRemoteFileSize(target, remotePath);

  if (remoteSize === localSize) {
    logger.info(
      `[UPLOAD] 远端文件已完整 (${formatBytes(localSize)})，跳过上传`
    );
    return;
  }

  const isResume = remoteSize > 0 && remoteSize < localSize;

  if (remoteSize > localSize) {
    logger.warn(
      `[UPLOAD] 远端文件 (${formatBytes(remoteSize)}) > 本地 (${formatBytes(localSize)})，重新上传`
    );
  } else if (isResume) {
    const pct = ((remoteSize / localSize) * 100).toFixed(0);
    logger.info(
      `[UPLOAD] 断点续传: 从 ${formatBytes(remoteSize)} 开始 (${pct}% 已传)`
    );
  }

  const sshProc = spawn("ssh", [
    ...buildSshArgs(target),
    `${target.user}@${target.host}`,
    isResume
      ? `mkdir -p "${posix.dirname(remotePath)}" && cat >> "${remotePath}"`
      : `mkdir -p "${posix.dirname(remotePath)}" && cat > "${remotePath}"`,
  ]);

  // 续传时从 remoteSize 位置开始读取本地文件（纯 Node，不依赖 dd）
  const reader = createReadStream(
    localPath,
    isResume ? { start: remoteSize } : {}
  );
  reader.pipe(sshProc.stdin);

  // 实时进度监控（喂给 spinner 单行刷新，替代逐秒日志刷屏）
  const startMs = Date.now();
  let uploadedBytes = isResume ? remoteSize : 0;
  let lastUpdate = Date.now();

  reader.on("data", (chunk) => {
    uploadedBytes += chunk.length;
    const now = Date.now();
    if (now - lastUpdate >= 1000) {
      const elapsed = (now - startMs) / 1000;
      const pct = ((uploadedBytes / localSize) * 100).toFixed(0);
      const transferred = uploadedBytes - (isResume ? remoteSize : 0);
      const speed =
        elapsed > 0 ? (transferred / 1024 / elapsed).toFixed(0) : "∞";
      const text = `[SEND] ↑ ${formatBytes(uploadedBytes)}/${formatBytes(localSize)} (${pct}%) ${speed} KB/s`;
      // TTY：单行刷新不打扰；非 TTY（CI/管道）：退化为逐秒日志行
      if (spinner.supported) spinner.update(text);
      else logger.info(text);
      lastUpdate = now;
    }
  });

  return new Promise((resolve, reject) => {
    let stderr = "";
    let pipeClosedEarly = false;
    sshProc.stderr.on("data", (d) => {
      const text = d.toString();
      stderr += text;
      // 实时透传远端报错（如 Permission denied），失败原因第一时间可见
      for (const line of text.split("\n")) {
        const msg = line.trim();
        if (msg && !msg.includes("Warning: Permanently added")) {
          logger.raw(`  [ssh] ${msg}`);
        }
      }
    });
    // ssh 提前退出（远端 mkdir 失败：权限/磁盘等）后 stdin 成关闭管道，
    // reader 继续写入触发 EPIPE → unhandled 'error' 裸崩。
    // 捕获后停止读本地文件，交由 exit 事件带出完整 stderr 统一 reject。
    sshProc.stdin.on("error", () => {
      pipeClosedEarly = true;
      reader.destroy();
      // 兜底：极端情况下（半死连接）exit 迟迟不来，5s 后直接以已收集的 stderr 拒绝
      setTimeout(() => {
        reject(
          new Error(
            `上传失败: 连接中断${stderr.trim() ? `: ${stderr.trim()}` : ""}`
          )
        );
      }, 5000);
    });
    sshProc.on("exit", (code) => {
      if (code === 0) resolve();
      else {
        const hint = pipeClosedEarly
          ? "（连接被远端提前关闭，多为远端命令失败：权限/路径/磁盘）"
          : "";
        reject(new Error(`上传失败（exit ${code}）${hint}: ${stderr.trim()}`));
      }
    });
    sshProc.on("error", (err) =>
      reject(new Error(`无法启动 ssh: ${err.message}`))
    );
    reader.on("error", (err) => {
      sshProc.stdin.destroy();
      reject(new Error(`读取本地文件失败: ${err.message}`));
    });
  });
}

/** 查询远端文件字节数（用于断点续传） */
async function getRemoteFileSize(target, remotePath) {
  try {
    const out = await sshExec(
      target,
      `stat -c %s "${remotePath}" 2>/dev/null || echo 0`
    );
    return parseInt(out, 10) || 0;
  } catch {
    return 0;
  }
}

/** 把脚本通过 stdin 喂给远端 bash -s 执行（单会话，断连后远端继续跑） */
function runRemoteScript(target, script) {
  const sshProc = spawn("ssh", [
    ...buildSshArgs(target),
    `${target.user}@${target.host}`,
    "bash -s",
  ]);
  let stdout = "";
  let stderr = "";
  return new Promise((resolveOut, reject) => {
    sshProc.stdout.on("data", (d) => (stdout += d.toString()));
    sshProc.stderr.on("data", (d) => (stderr += d.toString()));
    // 脚本写入瞬间 ssh 断开（EPIPE）时避免 unhandled error 裸崩；
    // 失败信息由 exit 事件携带 stderr 统一 reject
    sshProc.stdin.on("error", () => {});
    sshProc.stdin.end(script);
    sshProc.on("exit", (code) => {
      if (code === 0) resolveOut(stdout.trim());
      else reject(new Error(`远端脚本失败（exit ${code}）: ${stderr.trim()}`));
    });
    sshProc.on("error", (err) =>
      reject(new Error(`无法启动 ssh: ${err.message}`))
    );
  });
}
