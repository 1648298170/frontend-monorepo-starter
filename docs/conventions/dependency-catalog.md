# pnpm Catalog 依赖版本规范

仓库使用 `pnpm-workspace.yaml` 中的 `catalog` 集中管理 React 和 Vue
生态依赖版本。

```yaml
catalog:
  react: ^19.2.1
  react-dom: ^19.2.1
  vue: ^3.5.25
```

实际使用依赖的 workspace 仍需在自己的 `package.json` 中声明：

```json
{
  "dependencies": {
    "react": "catalog:"
  }
}
```

## 设计原则

- Catalog 只统一版本，不改变依赖归属。
- 应用和组件包必须声明自己直接使用的依赖。
- 仓库内部包继续使用 `workspace:*`。
- React、Vue、路由、状态库、框架类型和 Vite 框架插件由 catalog 管理。
- 应用层常用基础库也由 catalog 管理：React 应用使用 `ahooks`，Vue 应用使用
  `@vueuse/core`，两类应用都可以按需使用 `lodash`。
- 根目录工程工具链由根 `package.json` 管理，不为了形式统一全部移入 catalog。

## 应用基础库约定

| 依赖           | 使用范围         | 说明                                      |
| -------------- | ---------------- | ----------------------------------------- |
| `ahooks`       | React 应用       | React 业务 Hook、异步请求和交互状态复用。 |
| `@vueuse/core` | Vue 应用         | Vue 浏览器能力和组合式工具函数复用。      |
| `lodash`       | React / Vue 应用 | 通用数据处理，优先按方法路径导入。        |

这些依赖的版本放在 `pnpm-workspace.yaml` 的 `catalog` 中统一维护，但仍然只声明在真实使用
它们的应用或 Package 中。不要因为 catalog 已经登记，就把它们安装到根目录。

## 为指定 Workspace 安装依赖

在仓库根目录通过 `--filter` 指定应用或 Package：

```bash
# 安装到 React 应用的 dependencies。
pnpm --filter @apps/react-web add axios

# 安装到 Vue 应用的 devDependencies。
pnpm --filter @apps/vue-web add -D unplugin-auto-import

# 安装到共享请求包。
pnpm --filter @repo/request add ofetch
```

也可以进入目标目录后执行 `pnpm add`。两种方式都只会修改目标 Workspace 的
`package.json`，根目录继续统一维护 `pnpm-lock.yaml`。

根目录只安装 ESLint、TypeScript、Prettier、Turbo 等全仓库工程工具：

```bash
pnpm add -Dw <工程工具包名>
```

使用 catalog 中已有的依赖时，通过 `catalog:` 引用统一版本：

```bash
pnpm --filter @apps/react-web add react@catalog:
```

对于准备由多个 Workspace 使用的新依赖，先把版本写入 `pnpm-workspace.yaml`：

```yaml
catalog:
  example-package: ^1.0.0
```

然后在每个实际使用方分别安装：

```bash
pnpm --filter @apps/react-web add example-package@catalog:
pnpm --filter @apps/vue-web add example-package@catalog:
```

Catalog 负责统一版本，`--filter` 负责确定依赖归属，两者解决的是不同问题。

## 升级依赖

升级框架版本时只修改 `pnpm-workspace.yaml` 中的 catalog，然后执行：

```bash
pnpm install
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

不要在单个应用中直接把 `catalog:` 替换成版本号，否则会绕过仓库的版本统一策略。
