# Frontend Monorepo Starter

这是一个面向业务项目的前端 monorepo 模板。它不是单纯把多个项目塞进一个仓库，而是希望把“应用代码、共享能力、框架适配、工程配置”分清楚，让项目在后续新增应用、多人协作、沉淀公共能力时仍然容易维护。

## 设计目标

这个模板主要服务三件事：

- 同一个仓库内同时支持 Vue 和 React 业务应用。
- 把可复用能力沉淀到 packages，避免在不同应用里复制粘贴。
- 用统一的工程规范降低维护成本，包括 TypeScript、ESLint、Prettier、测试和构建流程。

它偏向“业务项目模板”，不是组件库发布模板。因此第一版更关注项目结构、包边界、开发体验和长期可扩展性。

## 技术栈

- 包管理：pnpm workspace
- 任务编排：Turborepo
- 构建工具：Vite 8，生产构建默认使用 Rolldown
- Vue 应用：Vue 3 + Vue Router + Pinia + TypeScript
- React 应用：React + React Router + Zustand 预留 + TypeScript
- 代码规范：ESLint + Prettier
- 测试：Vitest

GitLab CI 已保留设计文档，但第一版不创建 `.gitlab-ci.yml`。

## Vite 8 与 Rolldown

本模板使用 Vite 8 作为构建工具。Vite 8 的生产构建默认基于 Rolldown，不再使用传统 Rollup 作为生产打包器。

当前两个应用都通过各自的 `vite.config.ts` 配置：

```txt
apps/vue-web/vite.config.ts
apps/react-web/vite.config.ts
```

如果后续需要配置生产打包选项，应优先使用 Vite 8 的 `rolldownOptions`，而不是旧版 Vite/Rollup 里的 `rollupOptions`。

示例：

```ts
export default defineConfig({
  build: {
    rolldownOptions: {
      output: {
        manualChunks: {
          vendor: ["vue"],
        },
      },
    },
  },
});
```

如果后续需要调整 JSX 转换能力，优先使用 Vite 8 的 `oxc` 配置，而不是旧的 `esbuild` 配置。

## 项目结构

```txt
frontend-monorepo-starter/
  apps/
    vue-web/                 # Vue 业务应用模板
    react-web/               # React 业务应用模板

  packages/
    shared/
      auth/                  # 框架无关权限判断规则
      utils/                 # 框架无关工具函数
      request/               # 框架无关请求封装
      config/                # 框架无关运行时配置
      observability/         # 框架无关错误上报契约

    vue/
      auth/                  # Vue 权限 Provider、Composable 与 Guard
      ui/                    # Vue 专属 UI 基础组件

    react/
      auth/                  # React 权限 Provider、Hook 与 Guard
      ui/                    # React 专属 UI 基础组件

    tooling/
      eslint-config/         # 共享 ESLint 配置
      tsconfig/              # 共享 TypeScript 配置

  docs/
    architecture/            # 架构说明
    conventions/             # 协作约定
    ci/                      # CI 预留设计

  package.json
  pnpm-workspace.yaml
  turbo.json
```

## 架构理念

### 1. apps 保持薄

`apps/*` 是具体业务应用，例如 `apps/vue-web` 和 `apps/react-web`。

应用层主要负责：

- 应用入口
- 路由注册
- 页面组合
- 状态管理接入
- 应用级样式
- 业务页面

应用层不应该沉淀大量通用逻辑。如果某段代码未来可能被另一个应用复用，优先考虑放到 `packages/*`。

### 2. shared 放框架无关能力

`packages/shared/*` 里的代码不应该依赖 Vue 或 React。

当前包括：

- `@repo/auth`：框架无关权限判断规则
- `@repo/utils`：日期、数字、格式化等纯工具函数
- `@repo/request`：fetch 请求客户端、错误类型
- `@repo/config`：运行时配置解析

这类包的特点是稳定、通用、容易测试。它们是整个 monorepo 最适合长期复用的底层能力。

### 3. vue 和 react 分开放框架适配

Vue 和 React 的组件模型、状态模型、生态习惯不同，所以框架相关能力不要混在一起。

当前包括：

- `@repo/vue-auth`
- `@repo/vue-ui`
- `@repo/react-auth`
- `@repo/react-ui`

这样做的好处是：两个技术栈可以共享业务底层能力，但 UI 和框架代码可以独立演进，不会互相牵制。

### 4. tooling 统一工程规范

`packages/tooling/*` 用来沉淀团队级工程配置。

当前包括：

- `@repo/tsconfig`
- `@repo/eslint-config`

所有 app 和 package 都复用这些配置，避免每个项目各自维护一份规范。后续如果要调整 TypeScript strict 规则、ESLint 规则，只需要改 tooling 包。

## 包边界约定

每个 package 都应该通过 `src/index.ts` 暴露 public API。

推荐：

```ts
import { formatDate } from "@repo/utils";
```

避免：

```ts
import { formatDate } from "@repo/utils/src/date";
```

这样可以让包内部结构自由调整，而不会影响调用方。长期维护 monorepo 时，这个约定很重要。

## 新增能力应该放哪里

如果是纯函数、和框架无关：

```txt
packages/shared/utils
```

如果是请求、错误处理、鉴权头、接口客户端：

```txt
packages/shared/request
```

如果是环境变量、运行时配置、应用配置：

```txt
packages/shared/config
```

环境文件本身归属具体应用：

```txt
apps/react-web/.env.*
apps/vue-web/.env.*
```

应用负责提供环境值，`packages/shared/config` 只提供框架无关的解析、默认值和校验。
业务环境支持 `local`、`test`、`uat`、`production`；其中本地环境使用 Vite
标准的 `development` mode。详细约定见
[`docs/conventions/environment-variables.md`](docs/conventions/environment-variables.md)。

Vite 开发代理、Sass 注入、静态资源和 Rolldown 分包约定见
[`docs/conventions/vite.md`](docs/conventions/vite.md)。

React Router、Vue Router、Zustand 和 Pinia 的分层及扩展规范见
[`docs/conventions/state-and-routing.md`](docs/conventions/state-and-routing.md)。

源码、样式和 Workspace 包的命名规范及后续阶段计划见
[`docs/conventions/naming.md`](docs/conventions/naming.md)。

单元测试、React/Vue 组件测试和覆盖率规范见
[`docs/conventions/testing.md`](docs/conventions/testing.md)。

请求客户端、错误上报和两套框架异常边界设计见
[`docs/conventions/reliability.md`](docs/conventions/reliability.md)。

框架无关权限规则、React/Vue Provider 与 Guard 的使用边界见
[`docs/conventions/authorization.md`](docs/conventions/authorization.md)。

组件、Feature、Page、Store、Hook 和 Composable 的生成命令见
[`docs/conventions/code-generation.md`](docs/conventions/code-generation.md)。

未使用文件、导出、依赖和 catalog 条目的治理方式见
[`docs/conventions/dependency-health.md`](docs/conventions/dependency-health.md)。

如果是 Vue 组件或 composable：

```txt
packages/vue/*
```

如果是 React 组件或 hook：

```txt
packages/react/*
```

如果是具体页面、具体业务流程、只属于某个应用：

```txt
apps/vue-web
apps/react-web
```

## 常用命令

开发环境要求：

- Node.js：`>=22.12.0`
- pnpm：`10.18.3`
- npm：`>=10.9.0 <11`，仅作为 Node.js 工具链保留，不用于安装依赖

仓库只允许使用 pnpm 安装依赖。版本约束、初始化方式和升级流程见
[`docs/conventions/runtime-versions.md`](docs/conventions/runtime-versions.md)。

检查本地工具链版本：

```bash
pnpm check:runtime
```

安装依赖：

```bash
pnpm install
```

启动全部应用：

```bash
pnpm dev
```

只启动 Vue 应用：

```bash
pnpm dev:vue
```

只启动 React 应用：

```bash
pnpm dev:react
```

代码检查：

```bash
pnpm lint
```

依赖健康检查：

```bash
pnpm lint:unused
```

类型检查：

```bash
pnpm typecheck
```

测试：

```bash
pnpm test
```

构建：

```bash
pnpm build
```

根命令会同时构建两个业务应用，产物分别位于：

```txt
apps/react-web/dist/
apps/vue-web/dist/
```

Monorepo 根目录不会额外生成统一的 `dist/`。Turbo 已将应用的 `dist/**`
声明为构建输出，缓存命中时也会自动恢复产物。

格式化：

```bash
pnpm format
```

使用代码生成器：

```bash
pnpm g --help
pnpm g component --app react-web --scope app --name app-header
```

`pnpm generate` 与 `pnpm g` 等价。生成器默认创建测试、拒绝覆盖已有文件，并支持
`--dry-run` 预览完整变更计划。

## 当前预留但未实现

以下能力已经在结构或文档中预留，但第一版没有实现：

- GitLab CI
- 自动部署
- Storybook
- Playwright E2E
- changesets 发包流程

其中 GitLab CI 的设计说明在：

```txt
docs/ci/gitlab-ci.md
```

## 后续扩展建议

新增业务应用时，优先放到：

```txt
apps/admin
apps/mobile-web
apps/internal-tool
```

新增共享能力时，优先判断它是否框架无关。框架无关就放 `packages/shared/*`，框架相关再放 `packages/vue/*` 或 `packages/react/*`。

当公共包变复杂时，每个包都应该补充：

- README
- 单元测试
- 清晰的 public API
- 使用示例

这个模板的核心思路是：应用负责装配，packages 负责沉淀能力，tooling 负责统一规范。
