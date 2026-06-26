# Package 边界规范

处理 `packages/*` 时，先读：

```text
docs/conventions/package-boundaries.md
docs/conventions/application-structure.md
docs/conventions/dependency-catalog.md
```

## 边界规则

- `packages/shared/*` 只能放跨框架能力，不依赖 React、Vue、Router 或应用 Store。
- `packages/react/*` 只放 React 专属能力，可以依赖 React。
- `packages/vue/*` 只放 Vue 专属能力，可以依赖 Vue。
- `packages/tooling/*` 只放工程配置和工具能力，不放业务逻辑。
- 应用可以依赖 shared 和对应框架包。
- shared 包不要依赖应用。
- React 包不要依赖 Vue 包，Vue 包不要依赖 React 包。

## 何时新增包

新增包前先判断：

- 是否至少两个应用或模板会复用。
- 是否有清晰稳定的 public API。
- 是否能避免跨边界依赖泄漏。
- 是否有测试价值和文档价值。

不要新增 `common`、`helpers`、`constants` 这类边界模糊的包。

## 包内结构建议

```text
src/
  index.ts
  domain-or-feature/
    index.ts
    *.types.ts
    *.test.ts
```

React/Vue 组件包可以使用：

```text
src/
  components/
  styles/
  test/
  index.ts
```

## 修改 package 后验证

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm lint:unused
```
