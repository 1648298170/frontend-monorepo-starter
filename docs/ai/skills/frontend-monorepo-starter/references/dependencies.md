# 依赖与 Catalog 规范

处理依赖安装、升级、迁移、未使用依赖、lockfile 变更时，先读：

```text
docs/conventions/dependency-catalog.md
docs/conventions/dependency-health.md
docs/conventions/runtime-versions.md
pnpm-workspace.yaml
package.json
```

## 基本规则

- 使用 `pnpm`，不要使用 npm 或 yarn 安装项目依赖。
- pnpm 版本由根 `package.json` 的 `packageManager` 和 `engines.pnpm` 约束。
- 多个 workspace 共享版本时，把版本写入 `pnpm-workspace.yaml` 的 `catalog`。
- catalog 只统一版本，不改变依赖归属。
- 实际使用依赖的 workspace 仍必须在自己的 `package.json` 声明。
- 根 `package.json` 只放 ESLint、Prettier、TypeScript、Turbo、Husky 等全仓库工具。
- 业务依赖不要因为“全仓库统一版本”就安装到根目录。

## 当前应用基础库

- React 应用：`ahooks`、`lodash`。
- Vue 应用：`@vueuse/core`、`lodash`。
- 使用 `lodash` 时优先按方法路径导入，例如 `lodash/startCase`。
- 使用 `lodash` 的 workspace 同时声明 `@types/lodash`。

## 常用命令

```bash
# 给指定 React 应用安装运行时依赖。
pnpm --filter @apps/react-web add axios

# 给指定 Vue 应用安装开发依赖。
pnpm --filter @apps/vue-web add -D unplugin-auto-import

# 使用 catalog 中已有版本。
pnpm --filter @apps/react-web add lodash@catalog:

# 给根目录安装工程工具。
pnpm add -Dw <tool-package>
```

## 修改依赖后验证

```bash
pnpm install
pnpm lint:unused
pnpm typecheck
pnpm test
pnpm build
```

如果依赖涉及应用模板，也运行：

```bash
pnpm verify:app-templates
```
