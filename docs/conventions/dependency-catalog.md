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
- 根目录工程工具链由根 `package.json` 管理，不为了形式统一全部移入 catalog。

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
