import { basename, dirname, resolve } from "node:path";

// 根命令显式传入 --app 时直接使用；应用内脚本则根据当前工作目录识别自身名称。
export function resolveAppName({ workspaceRoot, cwd, explicitAppName }) {
  if (explicitAppName) {
    return explicitAppName;
  }

  const appsRoot = resolve(workspaceRoot, "apps");
  const currentDirectory = resolve(cwd);

  // 只允许从 apps 的直接子目录推断，避免在仓库根目录误修改不确定的应用。
  if (dirname(currentDirectory) !== appsRoot) {
    throw new Error(
      "缺少参数 --app。请从 apps/<应用名> 目录运行应用版本命令，或在根目录显式传入 --app。"
    );
  }

  return basename(currentDirectory);
}
