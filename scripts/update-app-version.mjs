import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";

import { bumpSemver, parseSemver } from "./version/semver.mjs";
import { resolveAppName } from "./version/resolve-app-name.mjs";
import { updatePackageVersion } from "./version/update-package-version.mjs";

const supportedOptions = new Set(["app", "bump", "set", "dry-run"]);

// 版本命令使用独立参数解析器，防止生成器参数和版本参数互相污染。
function parseArguments(argv) {
  const options = {};

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];

    if (!token.startsWith("--")) {
      throw new Error(`无法识别参数：${token}`);
    }

    const key = token.slice(2);

    if (!supportedOptions.has(key)) {
      throw new Error(`不支持参数 --${key}。`);
    }

    if (key === "dry-run") {
      options[key] = true;
      continue;
    }

    const value = argv[index + 1];

    if (!value || value.startsWith("--")) {
      throw new Error(`参数 --${key} 缺少值。`);
    }

    options[key] = value;
    index += 1;
  }

  return options;
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  const workspaceRoot = resolve(import.meta.dirname, "..");
  // 根目录命令使用 --app，应用 package.json 内的命令则从 pnpm 设置的当前目录自动识别。
  const appName = resolveAppName({
    workspaceRoot,
    cwd: process.cwd(),
    explicitAppName: options.app,
  });

  if (!/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(appName)) {
    throw new Error("应用名必须使用以字母开头的 kebab-case。");
  }

  if (Boolean(options.bump) === Boolean(options.set)) {
    throw new Error("--bump 与 --set 必须且只能提供一个。");
  }

  const packageJsonPath = join(workspaceRoot, "apps", appName, "package.json");
  const packageJson = JSON.parse(await readFile(packageJsonPath, "utf8"));
  const expectedPackageName = `@apps/${appName}`;

  if (packageJson.name !== expectedPackageName) {
    throw new Error(
      `应用包名应为 ${expectedPackageName}，实际为 ${packageJson.name ?? "(空)"}。`
    );
  }

  parseSemver(packageJson.version);
  const nextVersion = options.set
    ? String(options.set)
    : bumpSemver(packageJson.version, options.bump);
  parseSemver(nextVersion);

  console.log(`应用：${expectedPackageName}`);
  console.log(`版本：${packageJson.version} -> ${nextVersion}`);
  console.log(`文件：apps/${appName}/package.json`);

  if (options["dry-run"]) {
    console.log("当前为 dry-run，未修改文件。");
    return;
  }

  await updatePackageVersion(packageJsonPath, nextVersion);
  console.log("版本更新完成。该命令不会创建 Git commit 或 Tag。");
}

main().catch((error) => {
  console.error(`版本更新失败：${error.message}`);
  process.exitCode = 1;
});
