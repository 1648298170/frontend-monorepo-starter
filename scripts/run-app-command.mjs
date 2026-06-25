import { access, readFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { join, resolve } from "node:path";

const supportedCommands = new Set(["dev", "build", "test"]);

// 将简短应用名安全转换为 pnpm filter，不把未经校验的输入拼接成 shell 命令。
async function main() {
  const [command, appName] = process.argv.slice(2);

  if (!supportedCommands.has(command) || !appName) {
    throw new Error(
      "用法：node scripts/run-app-command.mjs <dev|build|test> <app-name>"
    );
  }

  if (!/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(appName)) {
    throw new Error("应用名必须使用以字母开头的 kebab-case。");
  }

  const workspaceRoot = resolve(import.meta.dirname, "..");
  const packageJsonPath = join(workspaceRoot, "apps", appName, "package.json");
  await access(packageJsonPath);
  const packageJson = JSON.parse(await readFile(packageJsonPath, "utf8"));
  const packageName = `@apps/${appName}`;

  if (packageJson.name !== packageName) {
    throw new Error(`应用包名应为 ${packageName}。`);
  }

  const pnpmCli = process.env.npm_execpath;

  if (!pnpmCli) {
    throw new Error("无法定位当前 pnpm CLI，请通过 pnpm 运行该命令。");
  }

  const child = spawn(
    process.execPath,
    [pnpmCli, "--filter", packageName, command],
    {
      cwd: workspaceRoot,
      stdio: "inherit",
      shell: false,
    }
  );

  child.on("exit", (code) => {
    process.exitCode = code ?? 1;
  });
  child.on("error", (error) => {
    console.error(`无法启动 pnpm 子进程：${error.message}`);
    process.exitCode = 1;
  });
}

main().catch((error) => {
  console.error(`应用命令执行失败：${error.message}`);
  process.exitCode = 1;
});
