import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { logger } from "./logger.mjs";

/**
 * 在 monorepo 根调用 pnpm 构建目标 app 的指定 mode。
 * 通过 spawn 透传 stdout/stderr，便于调试。
 *
 * @param {string} app - 例如 "vue-web"
 * @param {string} buildCmd - 该 app 的 package.json 脚本名，例如 "build:test"
 * @returns {Promise<string>} 产物绝对路径
 */
export async function buildApp(app, buildCmd, outDir) {
  logger.info(`[BUILD] pnpm --filter @apps/${app} ${buildCmd}`);
  const start = Date.now();

  await new Promise((resolve, reject) => {
    const proc = spawn("pnpm", ["--filter", `@apps/${app}`, "run", buildCmd], {
      stdio: "inherit",
      // Windows 上需要 shell 来解析 pnpm.cmd / pnpm.ps1
      shell: process.platform === "win32",
    });
    proc.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`构建失败，退出码 ${code}`));
    });
    proc.on("error", (err) =>
      reject(new Error(`无法启动 pnpm：${err.message}`))
    );
  });

  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  const absOutDir = resolve(process.cwd(), outDir);
  if (!existsSync(absOutDir)) {
    throw new Error(`构建产物不存在: ${absOutDir}`);
  }
  logger.success(`[BUILD] ${elapsed}s  产物=${outDir}`);
  return absOutDir;
}
