import { readFile, rm, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { join, resolve } from "node:path";

import { planGeneration } from "./generator/plan-generation.mjs";
import { applyChanges, validateChanges } from "./generator/transaction.mjs";

const workspaceRoot = resolve(import.meta.dirname, "..");
const lockfilePath = join(workspaceRoot, "pnpm-lock.yaml");
const verificationApps = [
  {
    name: "template-react-verification",
    framework: "react",
    port: "6291",
  },
  {
    name: "template-vue-verification",
    framework: "vue",
    port: "6292",
  },
];

// 模板校验会短暂创建临时应用并执行 pnpm install，先保存锁文件原文，避免结束后留下格式化或临时 Workspace 噪声。
async function readLockfileSnapshot() {
  return readFile(lockfilePath, "utf8");
}

// 无论 pnpm 在校验过程中如何重写锁文件，脚本结束时都恢复进入脚本前的真实仓库状态。
async function restoreLockfileSnapshot(snapshot) {
  await writeFile(lockfilePath, snapshot, "utf8");
}

// 统一运行 pnpm 子进程并继承输出，任何步骤失败都会中止验证并进入清理流程。
function runPnpm(args) {
  const pnpmCli = process.env.npm_execpath;

  if (!pnpmCli) {
    throw new Error("无法定位当前 pnpm CLI，请通过 pnpm 运行该命令。");
  }

  const result = spawnSync(process.execPath, [pnpmCli, ...args], {
    cwd: workspaceRoot,
    stdio: "inherit",
    shell: false,
  });

  if (result.error || result.status !== 0) {
    throw new Error(`pnpm ${args.join(" ")} 执行失败。`);
  }
}

// 删除范围固定在 apps/<verification-name>，避免清理逻辑误删真实业务应用。
async function cleanupVerificationApps() {
  for (const app of verificationApps) {
    await rm(join(workspaceRoot, "apps", app.name), {
      recursive: true,
      force: true,
      // Windows 上构建进程退出后可能短暂持有文件句柄，退避重试可避免偶发 EBUSY。
      maxRetries: 5,
      retryDelay: 200,
    });
  }
}

async function main() {
  const lockfileSnapshot = await readLockfileSnapshot();

  await cleanupVerificationApps();

  try {
    for (const app of verificationApps) {
      const { changes } = await planGeneration({
        workspaceRoot,
        type: "app",
        options: {
          name: app.name,
          framework: app.framework,
          port: app.port,
          "display-name": `${app.framework} template verification`,
        },
      });

      await validateChanges(changes);
      await applyChanges(changes);
    }

    // 模板依赖应已存在于锁文件，离线安装可以同时发现遗漏依赖和意外网络依赖。
    runPnpm(["install", "--offline"]);

    for (const app of verificationApps) {
      const packageName = `@apps/${app.name}`;

      for (const command of ["lint", "typecheck", "test", "build"]) {
        runPnpm(["--filter", packageName, command]);
      }

      // 版本命令使用 dry-run 验证模板脚本和应用目录自动识别，不修改临时应用版本。
      runPnpm(["--filter", packageName, "version:patch", "--dry-run"]);
      // 再次调用代码生成器，确认任意应用名可通过 package.json 依赖识别目标框架。
      runPnpm([
        "g",
        "component",
        "--app",
        app.name,
        "--scope",
        "app",
        "--name",
        "verification-card",
        "--dry-run",
      ]);
    }

    console.log("React 与 Vue 应用模板完整性验证通过。");
  } finally {
    await cleanupVerificationApps();
    // 清理临时 Workspace 后重新安装，使 pnpm-lock.yaml 回到真实应用集合。
    runPnpm(["install", "--offline"]);
    await restoreLockfileSnapshot(lockfileSnapshot);
  }
}

main().catch((error) => {
  console.error(`应用模板验证失败：${error.message}`);
  process.exitCode = 1;
});
