import { rm } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { join, resolve } from "node:path";

import { planGeneration } from "./generator/plan-generation.mjs";
import { applyChanges, validateChanges } from "./generator/transaction.mjs";

const workspaceRoot = resolve(import.meta.dirname, "..");
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
    });
  }
}

async function main() {
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
    }

    console.log("React 与 Vue 应用模板完整性验证通过。");
  } finally {
    await cleanupVerificationApps();
    // 清理临时 Workspace 后重新安装，使 pnpm-lock.yaml 回到真实应用集合。
    runPnpm(["install", "--offline"]);
  }
}

main().catch((error) => {
  console.error(`应用模板验证失败：${error.message}`);
  process.exitCode = 1;
});
