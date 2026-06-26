# 架构规范入口

处理 monorepo 架构、目录职责、应用结构、公共包拆分时，先读这些文件：

```text
README.md
docs/architecture/monorepo.md
docs/guides/project-guide.md
docs/conventions/application-structure.md
docs/conventions/package-boundaries.md
docs/conventions/state-and-routing.md
```

## 目录职责

- `apps/*`：真实业务应用，负责路由、状态、运行时配置、页面组合和业务接入。
- `templates/apps/*`：应用生成器使用的模板，真实应用结构变化后要同步评估。
- `packages/shared/*`：跨框架纯能力，只放不依赖 React/Vue 的协议、工具、请求、配置、鉴权、
  可观测性和 Design Token。
- `packages/react/*`：React 专属能力，例如 React UI、React Auth。
- `packages/vue/*`：Vue 专属能力，例如 Vue UI、Vue Auth。
- `packages/tooling/*`：工程配置、ESLint、TSConfig、Playwright 等工具型包。
- `scripts/*`：仓库级命令、生成器、版本脚本和校验脚本。

## 设计原则

- 优先复用已有包边界，不为了“看起来统一”新增空包。
- 公共能力只有在跨应用、跨团队或跨模板确实复用时才下沉。
- 应用层可以自定义 UI 和业务命名，不强制所有样式都来自 Design Token。
- 工具链配置集中在 `packages/tooling/*`，应用只声明差异。
- 模板要代表推荐实践，但不能把模板变成复杂业务系统。

## 修改架构后的检查

- 是否破坏 `packages/shared/*` 不依赖框架的边界。
- 是否需要同步 `templates/apps/react` 或 `templates/apps/vue`。
- 是否需要更新 `README.md`、`docs/guides/project-guide.md` 或 `docs/conventions/*`。
- 是否需要新增生成器能力，而不是只手动改现有应用。
