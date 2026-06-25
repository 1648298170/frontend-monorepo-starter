// 布尔参数不消费后续 token，其余受支持参数必须显式提供字符串值。
const booleanOptions = new Set(["dry-run", "skip-test", "help"]);
// 参数白名单用于尽早发现拼写错误，避免未知选项被静默忽略。
const supportedOptions = new Set([
  ...booleanOptions,
  "app",
  "framework",
  "scope",
  "name",
  "feature",
  "page",
  "display-name",
  "port",
  "version",
  "preset",
]);

// 解析 --key value、--key=value 和布尔开关，不引入额外 CLI 依赖。
export function parseArguments(argv) {
  // 第一个位置参数表示生成类型，剩余 token 统一按长参数解析。
  const [type, ...tokens] = argv;
  const options = {};

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];

    if (!token.startsWith("--")) {
      throw new Error(`无法识别参数：${token}`);
    }

    const option = token.slice(2);
    const separatorIndex = option.indexOf("=");
    const key =
      separatorIndex === -1 ? option : option.slice(0, separatorIndex);

    if (!supportedOptions.has(key)) {
      throw new Error(`不支持参数 --${key}，请执行 pnpm g --help 查看用法。`);
    }

    if (booleanOptions.has(key)) {
      // 布尔参数支持 --dry-run 和 --dry-run=false 两种形式。
      options[key] =
        separatorIndex === -1
          ? true
          : option.slice(separatorIndex + 1) !== "false";
      continue;
    }

    const value =
      separatorIndex === -1
        ? tokens[index + 1]
        : option.slice(separatorIndex + 1);

    if (!value || value.startsWith("--")) {
      throw new Error(`参数 --${key} 缺少值。`);
    }

    options[key] = value;

    if (separatorIndex === -1) {
      index += 1;
    }
  }

  return { type, options };
}

// 生成器帮助信息同时展示完整命令和缩写命令。
export function getHelpText() {
  return `代码生成器

Usage:
  pnpm generate <type> [options]
  pnpm g <type> [options]

Types:
  app          生成完整 React 或 Vue 业务应用
  component    生成应用、Feature、Page 或 Workspace UI 组件
  feature      生成业务 Feature
  page         生成页面（不自动修改路由）
  store        生成 Zustand 或 Pinia Store
  hook         生成 React Hook
  composable   生成 Vue Composable

Common options:
  --app <apps 目录下的应用名>
  --framework react|vue
  --scope app|feature|page|ui
  --name <name>
  --feature <feature-name>
  --page <page-name>
  --display-name <display-name>
  --port <port>
  --version <semver>
  --preset standard
  --dry-run
  --skip-test
  --help

Examples:
  pnpm g app --name admin-web --framework react --display-name "运营管理后台"
  pnpm g component --app react-web --scope app --name app-header
  pnpm g component --app vue-web --scope feature --feature user --name user-form
  pnpm g component --app react-web --scope page --page order-detail --name order-summary
  pnpm g component --framework vue --scope ui --name data-table
  pnpm g feature --app react-web --name user-management
  pnpm g page --app vue-web --name order-detail
  pnpm g store --app react-web --name user-session
  pnpm g hook --app react-web --name use-pagination
  pnpm g composable --app vue-web --name use-pagination
`;
}
