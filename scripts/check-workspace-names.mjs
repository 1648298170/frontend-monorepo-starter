import { readFile } from "node:fs/promises";
import { relative, resolve, sep } from "node:path";

import fg from "fast-glob";
import validatePackageName from "validate-npm-package-name";
import { parse } from "yaml";

// 所有路径都以仓库根目录为基准，保证 Windows 和其他系统上的执行结果一致。
const workspaceRoot = resolve(import.meta.dirname, "..");
const workspaceFile = resolve(workspaceRoot, "pnpm-workspace.yaml");
// Workspace 目录统一使用小写 kebab-case，例如 design-tokens。
const kebabCasePattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

// 根据包所在的分层目录推导它唯一允许使用的 package.json name。
const workspaceRules = [
  {
    // 业务应用使用 @apps/<应用目录名>。
    pattern: /^apps\/([^/]+)$/,
    expectedName: ([name]) => `@apps/${name}`,
  },
  {
    // 框架无关共享包使用 @repo/<包目录名>。
    pattern: /^packages\/shared\/([^/]+)$/,
    expectedName: ([name]) => `@repo/${name}`,
  },
  {
    // React 专属包增加 react- 前缀，避免和其他框架包重名。
    pattern: /^packages\/react\/([^/]+)$/,
    expectedName: ([name]) => `@repo/react-${name}`,
  },
  {
    // Vue 专属包增加 vue- 前缀，避免和其他框架包重名。
    pattern: /^packages\/vue\/([^/]+)$/,
    expectedName: ([name]) => `@repo/vue-${name}`,
  },
  {
    // 工程配置包与共享包一样使用 @repo/<包目录名>。
    pattern: /^packages\/tooling\/([^/]+)$/,
    expectedName: ([name]) => `@repo/${name}`,
  },
];

// 直接解析 pnpm-workspace.yaml，确保扫描范围与 pnpm 实际管理范围一致。
const workspaceConfig = parse(await readFile(workspaceFile, "utf8"));
const workspacePatterns = workspaceConfig.packages;

if (!Array.isArray(workspacePatterns)) {
  throw new Error("pnpm-workspace.yaml must define a packages array.");
}

// 将每个 Workspace 匹配模式扩展为 package.json 路径，并排除普通目录。
const packageJsonPaths = await fg(
  workspacePatterns.map((pattern) => `${pattern}/package.json`),
  {
    absolute: true,
    cwd: workspaceRoot,
    onlyFiles: true,
    unique: true,
  }
);

// errors 保存全部校验问题，packageNames 用于发现不同目录使用了相同包名。
const errors = [];
const packageNames = new Map();

// 对每一个实际存在的 Workspace 包执行目录名、包名和私有属性检查。
for (const packageJsonPath of packageJsonPaths.sort()) {
  const packageDirectory = packageJsonPath.slice(
    0,
    -`${sep}package.json`.length
  );
  const workspacePath = normalizePath(
    relative(workspaceRoot, packageDirectory)
  );
  const packageJson = JSON.parse(await readFile(packageJsonPath, "utf8"));
  // 根据包路径找到对应的命名规则，未知分层必须先显式补充规则。
  const rule = workspaceRules.find(({ pattern }) =>
    pattern.test(workspacePath)
  );

  if (!rule) {
    errors.push(`${workspacePath}: no workspace naming rule is configured.`);
    continue;
  }

  const match = workspacePath.match(rule.pattern);
  const directoryNames = match?.slice(1) ?? [];

  // 检查规则捕获到的应用名或包目录名是否符合 kebab-case。
  for (const directoryName of directoryNames) {
    if (!kebabCasePattern.test(directoryName)) {
      errors.push(
        `${workspacePath}: workspace directory "${directoryName}" must use kebab-case.`
      );
    }
  }

  // 路径决定包名，避免目录调整后 package.json name 遗漏同步修改。
  const expectedName = rule.expectedName(directoryNames);

  if (packageJson.name !== expectedName) {
    errors.push(
      `${workspacePath}: package name must be "${expectedName}", received "${packageJson.name}".`
    );
  }

  // 当前模板中的 Workspace 包均为仓库内部包，不允许被意外发布到 npm。
  if (packageJson.private !== true) {
    errors.push(
      `${workspacePath}: internal workspace packages must be private.`
    );
  }

  if (typeof packageJson.name !== "string") {
    errors.push(`${workspacePath}: package.json must define a string name.`);
    continue;
  }

  // 使用 npm 官方命名规则验证作用域、字符和保留名称等约束。
  const validation = validatePackageName(packageJson.name);

  if (!validation.validForNewPackages) {
    const reasons = [
      ...(validation.errors ?? []),
      ...(validation.warnings ?? []),
    ];
    errors.push(
      `${workspacePath}: invalid package name "${packageJson.name}" (${reasons.join("; ")}).`
    );
  }

  // 包名是 Workspace 的唯一身份，不允许两个目录声明相同名称。
  const previousPath = packageNames.get(packageJson.name);

  if (previousPath) {
    errors.push(
      `${workspacePath}: duplicate package name "${packageJson.name}" also used by ${previousPath}.`
    );
  } else {
    packageNames.set(packageJson.name, workspacePath);
  }
}

// 输出所有问题并设置失败状态；无问题时打印本次检查的包数量。
if (errors.length > 0) {
  console.error("Workspace naming validation failed:\n");

  for (const error of errors) {
    console.error(`- ${error}`);
  }

  process.exitCode = 1;
} else {
  console.log(
    `Workspace naming validation passed (${packageJsonPaths.length} packages).`
  );
}

// Node.js path 在 Windows 返回反斜杠，这里统一为规则所使用的正斜杠。
function normalizePath(value) {
  return value.split(sep).join("/");
}
