#!/usr/bin/env node
/**
 * 部署脚本入口。
 *
 * 用法:
 *   pnpm ship <app> <env>            构建并部署
 *   pnpm ship <app> <env> --dry-run  仅打印计划，不执行
 *
 * 部署前会校验当前 git 分支是否匹配目标环境:
 *   test  环境 → 必须在 test 分支
 *   uat   环境 → 必须在 uat 分支
 *   production 环境 → 必须在 main 分支
 * 分支不匹配时拒绝部署，提示开发者先切换分支。
 *
 * 所有环境（test/uat/production）统一走 release 版本化管线：
 * releases/<ts>-<sha>/ + current 软链 + 回滚。
 */
import { execSync } from "node:child_process";
import { createInterface } from "node:readline";
import { stdin, stdout } from "node:process";
import { loadConfig, validateTarget, constants } from "./config.mjs";
import { buildApp } from "./builder.mjs";
import {
  deployToServerRelease,
  listReleases,
  getCurrentRelease,
  rollbackTo,
  makeReleaseName,
} from "./deployer.mjs";
import { logger, spinner } from "./logger.mjs";

/** 环境到分支的映射（production 要求 main 分支；分支模型不同时可在此调整） */
const ENV_BRANCH_MAP = {
  test: "test",
  uat: "uat",
  production: "main",
};

/** 解析命令行参数 */
function parseArgs(argv) {
  const args = {
    app: null,
    env: null,
    dryRun: false,
    rollback: false,
    version: null,
  };
  for (const arg of argv) {
    if (arg === "--dry-run") args.dryRun = true;
    else if (arg === "--rollback") args.rollback = true;
    else if (!args.app) args.app = arg;
    else if (!args.env) args.env = arg;
    else if (!args.version) args.version = arg;
    else throw new Error(`多余参数: ${arg}`);
  }
  return args;
}

/** 打印用法 */
function printUsage() {
  console.error("用法:");
  console.error(
    "  pnpm ship <app> <env>            部署到 test / uat / production"
  );
  console.error("  pnpm ship <app> <env> --dry-run  演练（不真传）");
  console.error(
    "  pnpm ship <app> <env> --rollback [release]  回滚（不指定则交互选择）"
  );
  console.error("");
  console.error(`支持的 app: ${constants.SUPPORTED_APPS.join(" ")}`);
  console.error("支持的 env: test | uat | production");
  console.error("");
  console.error(
    "分支校验: test 环境需在 test 分支，uat 环境需在 uat 分支，production 需在 main 分支"
  );
}

/** 获取当前 git 分支名 */
function getCurrentBranch() {
  try {
    return execSync("git branch --show-current", { encoding: "utf8" }).trim();
  } catch {
    return null;
  }
}

/** 校验当前分支是否匹配目标环境 */
function assertBranch(env) {
  const expected = ENV_BRANCH_MAP[env];
  if (!expected) return;
  const current = getCurrentBranch();
  if (!current) {
    logger.warn("[BRANCH] 无法检测当前 git 分支，跳过校验");
    return;
  }
  if (current !== expected) {
    logger.error(
      `分支校验失败：当前在 "${current}" 分支，部署 ${env} 环境需要切换到 "${expected}" 分支。`
    );
    logger.info(
      `请执行: git checkout ${expected} && git pull origin ${expected}`
    );
    logger.info(`然后重新运行: pnpm ship <app> ${env}`);
    process.exit(1);
  }
  logger.success(`[BRANCH] 当前分支: ${current} ✓`);
}

/** 主流程 */
async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (!args.app || !args.env) {
    printUsage();
    process.exitCode = 1;
    return;
  }

  const config = loadConfig();
  const target = validateTarget(config, args.app, args.env);

  // 回滚：所有环境均支持
  if (args.rollback) {
    await runRollback(target, args.version);
    return;
  }

  // 分支校验：不匹配则直接退出
  assertBranch(args.env);

  logger.blank();
  logger.info(
    `[START] deploy ${args.app} -> ${args.env}${args.dryRun ? " (dry-run)" : ""}`
  );
  logger.info(
    `[CONFIG] ${target.host}:${target.port}  user=${target.user}  deployPath=${target.deployPath}`
  );

  // 所有环境统一走 release 版本化管线
  if (args.dryRun) {
    await deployToServerRelease(target, target.outDir, makeReleaseName(), true);
    logger.success("[DRY-RUN] 完成。移除 --dry-run 重新执行即可真实部署。");
    return;
  }

  const outDir = await buildApp(args.app, target.buildCmd, target.outDir);
  await deployToServerRelease(target, outDir, makeReleaseName());

  logger.blank();
  logger.success(`部署完成: ${args.app} -> ${args.env}`);
}

/**
 * 交互式回滚：列出远端 releases，让用户选择一个版本切换 current。
 */
async function runRollback(target, explicitVersion) {
  spinner.start("[ROLLBACK] 读取远端 release 列表 ...");
  let releases;
  let current;
  try {
    [releases, current] = await Promise.all([
      listReleases(target),
      getCurrentRelease(target),
    ]);
    spinner.succeed(
      `[ROLLBACK] 远端共 ${releases.length} 个 release（当前: ${current || "无"}）`
    );
  } catch (err) {
    spinner.stop();
    throw err;
  }
  if (releases.length === 0) {
    logger.error(`远端没有可回滚的 release: ${target.deployPath}/releases/`);
    process.exitCode = 1;
    return;
  }

  let version = explicitVersion;
  if (!version) {
    logger.info("可选 release（当前: " + (current || "无") + "）:");
    releases.forEach((r, i) => logger.info(`  [${i + 1}] ${r}`));
    const rl = createInterface({ input: stdin, output: stdout });
    const answer = await rl.question("输入序号或 release 名：");
    rl.close();
    const idx = Number(answer);
    if (!Number.isNaN(idx) && idx >= 1 && idx <= releases.length) {
      version = releases[idx - 1];
    } else if (releases.includes(answer)) {
      version = answer;
    } else {
      logger.error("无效选择");
      process.exitCode = 1;
      return;
    }
  }

  if (version === current) {
    logger.warn(`已是当前版本 ${current}，无需回滚`);
    return;
  }
  spinner.start(`[ROLLBACK] current → releases/${version} ...`);
  try {
    await rollbackTo(target, version);
    spinner.succeed(`[ROLLBACK] current → releases/${version}`);
  } catch (err) {
    spinner.stop();
    throw err;
  }
}

main().catch((error) => {
  spinner.stop();
  logger.error(error.message);
  process.exitCode = 1;
});
