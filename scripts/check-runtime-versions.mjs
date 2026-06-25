import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

// 以脚本自身位置定位仓库根目录，避免脚本从其他目录执行时读取错误配置。
const rootDirectory = fileURLToPath(new URL("../", import.meta.url));
// package.json 的 engines 是版本要求的唯一配置来源，脚本不再重复维护版本号。
const packageJson = JSON.parse(
  readFileSync(new URL("../package.json", import.meta.url), "utf8")
);
// 一次收集全部问题后统一输出，方便开发者一次性修正本地环境。
const errors = [];

// 将 v22.22.2、22.22 或 22 等格式统一转换成可比较的三段数字。
const parseVersion = (version) => {
  const match = version.trim().match(/^v?(\d+)(?:\.(\d+))?(?:\.(\d+))?/);

  if (!match) {
    throw new Error(`无法解析版本号：${version}`);
  }

  return match.slice(1).map((part) => Number(part ?? 0));
};

// 按主版本、次版本、补丁版本依次比较，返回值规则与 Array.sort 比较函数一致。
const compareVersions = (left, right) => {
  const leftParts = parseVersion(left);
  const rightParts = parseVersion(right);

  for (let index = 0; index < 3; index += 1) {
    if (leftParts[index] !== rightParts[index]) {
      return leftParts[index] - rightParts[index];
    }
  }

  return 0;
};

// 支持本仓库 engines 使用的简单范围，例如 ">=22" 和精确版本。
const satisfiesRange = (version, range) =>
  range.split(/\s+/).every((condition) => {
    const match = condition.match(/^(>=|<=|>|<|=)?(.+)$/);

    if (!match) {
      return false;
    }

    const [, operator = "=", expectedVersion] = match;
    const comparison = compareVersions(version, expectedVersion);

    return {
      ">": comparison > 0,
      ">=": comparison >= 0,
      "<": comparison < 0,
      "<=": comparison <= 0,
      "=": comparison === 0,
    }[operator];
  });

// 调用本机命令读取版本；Windows 下需要通过 shell 执行 pnpm.cmd、npm.cmd。
const readCommandVersion = (command) => {
  try {
    return execFileSync(command, ["--version"], {
      cwd: rootDirectory,
      encoding: "utf8",
      shell: process.platform === "win32",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return null;
  }
};

// Node.js 可直接读取当前进程版本，包管理器则读取其命令行版本。
const versions = {
  node: process.version,
  pnpm: readCommandVersion("pnpm"),
  npm: readCommandVersion("npm"),
};

// 逐项检查 package.json engines 中声明的工具是否已安装且满足版本范围。
for (const [runtime, expectedRange] of Object.entries(packageJson.engines)) {
  const actualVersion = versions[runtime];

  if (!actualVersion) {
    errors.push(`${runtime} 未安装，要求版本为 ${expectedRange}`);
    continue;
  }

  if (!satisfiesRange(actualVersion, expectedRange)) {
    errors.push(
      `${runtime} 当前版本为 ${actualVersion}，要求版本为 ${expectedRange}`
    );
  }
}

// preinstall 阶段额外检查安装命令来源，阻止 npm install 或 yarn install。
const userAgent = process.env.npm_config_user_agent ?? "";
const isInstallLifecycle = process.env.npm_lifecycle_event === "preinstall";

if (isInstallLifecycle && !userAgent.startsWith("pnpm/")) {
  errors.push("本仓库只允许使用 pnpm 安装依赖，请执行 pnpm install");
}

// 发现任何问题时以非零状态退出，从而中止安装或让 CI 任务失败。
if (errors.length > 0) {
  console.error("\n运行时版本检查失败：");

  for (const error of errors) {
    console.error(`- ${error}`);
  }

  console.error("\n可执行 corepack enable 后重新安装依赖。\n");
  process.exit(1);
}

// 手动执行 pnpm check:runtime 时，用一行结果确认当前实际工具链版本。
console.log(
  `运行时版本检查通过：Node.js ${versions.node}，pnpm ${versions.pnpm}，npm ${versions.npm}`
);
