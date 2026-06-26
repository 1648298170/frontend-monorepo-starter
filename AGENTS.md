# AI 开发入口

本项目是一个基于 pnpm workspace 的前端 monorepo 模板。任何 AI 在修改本仓库代码、配置、
文档、依赖、生成器或测试前，都应先阅读项目级 Skill：

```text
docs/ai/skills/frontend-monorepo-starter/SKILL.md
```

## 工作原则

- 先理解当前代码和相邻实现，再做改动。
- 优先遵守 `README.md`、`docs/guides/project-guide.md` 和 `docs/conventions/*`。
- 使用 `pnpm`，不要使用 npm 或 yarn 安装项目依赖。
- 依赖版本由 `pnpm-workspace.yaml` 的 catalog 统一时，使用方仍要在自己的
  `package.json` 中声明 `catalog:`。
- 修改应用结构、应用依赖或示例代码时，同步检查 `templates/apps/*` 是否需要更新。
- 修改模板或代码生成器后运行 `pnpm verify:app-templates`。
- 新增非平凡代码要写大概中文注释；JSON 文件不写注释。
- 不要回滚用户已有改动，不要混入无关重构。

## 常用验证

按变更范围选择验证命令：

```bash
pnpm format:check
pnpm typecheck
pnpm lint
pnpm test
pnpm build
pnpm lint:unused
pnpm verify:app-templates
pnpm test:e2e
```

更细的验证矩阵见：

```text
docs/ai/skills/frontend-monorepo-starter/references/verification.md
```
