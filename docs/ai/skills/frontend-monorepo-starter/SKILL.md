---
name: frontend-monorepo-starter
description: Use this project skill whenever working inside the frontend-monorepo-starter repository. It should be used for changes to apps, packages, templates, scripts, generators, pnpm catalog dependencies, Vite, TypeScript, ESLint, Stylelint, Sass, Playwright, Vitest, docs, or monorepo architecture. The skill routes the AI to the repository's current conventions and verification workflow so changes stay maintainable and extensible.
---

# Frontend Monorepo Starter Skill

本 Skill 是当前仓库的 AI 开发入口。它不替代 `docs/conventions/*`，而是告诉 AI 在不同任务下
应该读取哪些规范、遵守哪些边界、执行哪些验证。

## 使用时机

在本仓库内处理以下任意任务时使用本 Skill：

- 修改 `apps/*` 下的 React 或 Vue 应用。
- 修改 `packages/shared/*`、`packages/react/*`、`packages/vue/*`、`packages/tooling/*`。
- 修改 `templates/apps/*` 或 `scripts/generator/*`。
- 新增、升级或移动依赖。
- 修改 Vite、TypeScript、ESLint、Prettier、Stylelint、Sass、Playwright、Vitest。
- 修改 README、项目指南、规范文档或路线图。
- 调整 monorepo 架构、包边界、命名规范或生成器能力。

## 基础工作流

1. 确认当前目录是 `frontend-monorepo-starter`。
2. 读取 `README.md` 和 `docs/guides/project-guide.md` 的相关章节。
3. 根据任务类型读取本 Skill 的 `references/*`。
4. 再读取对应的 `docs/conventions/*` 原始规范。
5. 先检查相邻代码和既有模式，再实施改动。
6. 修改后按 `references/verification.md` 选择验证命令。
7. 最终回复说明改动范围、验证结果和残余风险。

## 核心约束

- 使用 `pnpm`，不要用 npm 或 yarn 安装项目依赖。
- 多个 workspace 共享的依赖版本放入 `pnpm-workspace.yaml` catalog。
- catalog 只统一版本，依赖仍声明在实际使用它的 workspace。
- 根 `package.json` 只放全仓库工程工具链。
- `packages/shared/*` 不依赖 React 或 Vue。
- React 应用和包不要依赖 Vue 包；Vue 应用和包不要依赖 React 包。
- 修改真实应用结构、应用依赖或示例代码时，检查并同步 `templates/apps/*`。
- 修改模板或生成器后运行 `pnpm verify:app-templates`。
- 新增非平凡代码要写大概中文注释，避免让维护者看黑盒。
- JSON 文件不写注释。
- 不要回滚用户未要求回滚的改动。
- 不要混入无关重构、无关格式化或元数据噪声。

## Reference 路由

按任务读取对应文件：

| 任务类型                | 先读 reference                     |
| ----------------------- | ---------------------------------- |
| 架构和目录调整          | `references/architecture.md`       |
| 依赖、catalog、lockfile | `references/dependencies.md`       |
| 应用功能开发            | `references/app-development.md`    |
| packages 边界调整       | `references/package-boundaries.md` |
| 代码生成器和模板        | `references/code-generation.md`    |
| 测试、E2E、测试示例     | `references/testing.md`            |
| 提交前验证              | `references/verification.md`       |

如果任务跨多个领域，读取多个 reference。不要一次性读取无关规范，保持上下文干净。

## 输出要求

最终回复使用中文，简洁说明：

- 改了什么。
- 涉及哪些区域。
- 跑了哪些验证命令。
- 是否存在未处理风险或外部限制。

如果没有改代码，只说明诊断结果和建议命令。
