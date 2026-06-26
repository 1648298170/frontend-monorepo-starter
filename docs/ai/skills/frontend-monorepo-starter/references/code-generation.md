# 代码生成器与模板规范

处理 `scripts/generator/*`、`templates/apps/*` 或 `pnpm generate` 能力时，先读：

```text
docs/conventions/code-generation.md
docs/guides/project-guide.md
scripts/generate.mjs
scripts/generator/
templates/apps/
```

## 生成器原则

- `pnpm generate` 和 `pnpm g` 都要可用。
- 生成器根据应用 `package.json` 的直接依赖识别 React 或 Vue，不依赖应用名称。
- 生成计划要清晰展示 CREATE / UPDATE。
- dry-run 不写入文件。
- 写入前校验目标文件，避免覆盖已有业务代码。
- 失败时尽量保持事务性，不留下半生成文件。

## 支持范围

当前生成器应支持：

- app：生成新应用。
- component：生成应用级或页面/功能目录下组件。
- page、hook、composable、store 等已有能力按当前脚本实现为准。

如果扩展生成类型：

- 同步 React 和 Vue 模板。
- 添加脚本测试。
- 更新 `docs/conventions/code-generation.md`。
- 更新 `docs/guides/project-guide.md`。

## 模板同步规则

真实应用发生以下变化时，检查模板是否要同步：

- 应用依赖变化。
- 应用目录结构变化。
- Vite、Vitest、Playwright、TSConfig 配置变化。
- 错误边界、运行时配置、状态库、路由结构变化。
- 示例组件或测试示例变化。

## 必跑验证

```bash
pnpm test:scripts
pnpm verify:app-templates
```
