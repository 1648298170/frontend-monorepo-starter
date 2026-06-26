# Frontend Monorepo 项目使用指南

这份指南是本项目的统一使用入口，面向新加入的开发同事、日常业务开发者和后续工程
维护者。目标不是要求一次读完所有规范，而是帮助团队快速完成以下事情：

1. 正确安装项目依赖。
2. 启动 React 或 Vue 应用。
3. 理解代码应该放在哪一层。
4. 使用生成器创建第一个业务模块。
5. 完成样式、状态、请求和测试开发。
6. 在提交代码前通过项目检查。

新同事建议先完整走一遍“第一项实践”，日常开发可以直接查阅对应章节，工程维护者可
结合文末的规范索引继续深入。

## 0. 项目定位

这是一个支持 React 与 Vue 两套业务应用的 pnpm Monorepo 模板，主要解决：

- 多个业务应用共享工程规范和基础能力。
- React/Vue 共享框架无关逻辑，同时保持框架实现独立。
- 统一依赖版本、构建、代码检查、测试和代码生成流程。
- 为后续新增应用、共享包和 GitLab CI 保留清晰扩展路径。

项目不是 npm 组件发布仓库，也不是单一应用脚手架。当前默认场景是企业业务系统、
管理后台和内部工具。

核心技术：

| 分类      | 技术                                             |
| --------- | ------------------------------------------------ |
| Workspace | pnpm workspace                                   |
| 任务编排  | Turborepo                                        |
| 构建      | Vite 8 + Rolldown                                |
| React     | React 19、React Router、Zustand                  |
| Vue       | Vue 3、Vue Router、Pinia                         |
| 样式      | Tailwind CSS 4、Sass、Design Token、Stylelint    |
| 质量      | TypeScript、ESLint、Prettier、Vitest、Playwright |
| 依赖治理  | pnpm catalog、Knip                               |

GitLab CI 当前保留设计文档但不提供 `.gitlab-ci.yml`，接入时应复用仓库现有命令，不另建
一套质量检查逻辑。

## 1. 开发环境准备

### 1.1 工具版本

本仓库要求：

| 工具       | 版本           | 说明                              |
| ---------- | -------------- | --------------------------------- |
| Node.js    | `>=22.12.0`    | 推荐使用仓库版本文件指定版本      |
| pnpm       | `10.18.3`      | 唯一允许使用的包管理器            |
| npm        | `>=10.9.0 <11` | 仅随 Node.js 保留，不用于安装     |
| TypeScript | `6.0.3`        | 根目录固定版本，全 Workspace 共用 |

推荐先启用 Corepack：

```bash
corepack enable
corepack prepare pnpm@10.18.3 --activate
```

检查本机版本：

```bash
node --version
pnpm --version
pnpm check:runtime
```

如果 `pnpm check:runtime` 失败，请先解决版本问题，不要跳过检查。完整版本说明见
[`../conventions/runtime-versions.md`](../conventions/runtime-versions.md)。

### 1.2 安装依赖

在仓库根目录执行：

```bash
pnpm install
```

不要使用：

```bash
npm install
yarn
```

项目通过 `pnpm-workspace.yaml` 管理 Workspace，并使用 catalog 统一核心依赖版本。
使用其他包管理器会产生不同锁文件和依赖树。

### 1.3 VS Code

使用 VS Code 打开仓库根目录：

```bash
code .
```

首次打开时必须安装以下工作区扩展：

- ESLint：`dbaeumer.vscode-eslint`
- Prettier：`esbenp.prettier-vscode`
- Stylelint：`stylelint.vscode-stylelint`
- Vue - Official：`vue.volar`

在扩展面板搜索 `@recommended` 并执行 **Install Workspace Recommended Extensions**，
安装完成后重新加载 VS Code。React 和 TypeScript 使用 VS Code 内置语言服务，不需要
额外安装 React 扩展。

同时保留仓库提供的格式化、保存行为和 TypeScript 设置。详细说明见
[`../conventions/vscode.md`](../conventions/vscode.md)。

## 2. 启动应用

仓库提供 React 和 Vue 两套业务应用模板。

启动 React：

```bash
pnpm dev:react
```

启动 Vue：

```bash
pnpm dev:vue
```

同时启动所有应用：

```bash
pnpm dev
```

首次执行端到端测试前安装 Chromium：

```bash
pnpm test:e2e:install
```

运行 React 和 Vue 两个应用的首页 E2E 冒烟测试：

```bash
pnpm test:e2e
```

Playwright 会自动启动对应应用，不需要提前运行 `pnpm dev`。完整命令、跨浏览器和远端
test/UAT 环境用法见 [`../conventions/testing.md`](../conventions/testing.md)。

默认端口由各应用的 `.env` 管理，不写在 package scripts 中。当前模板通常为：

- Vue：`http://localhost:5173`
- React：`http://localhost:5174`

如果端口被占用，请修改当前应用的 `.env.local`，不要直接改共享默认值：

```env
DEV_SERVER_PORT=5180
```

`.env.local` 不提交 Git。

## 3. 先理解四个代码区域

项目的核心结构：

```txt
apps/
  react-web/              # React 业务应用
  vue-web/                # Vue 业务应用

packages/
  shared/                 # 与 React/Vue 无关的共享能力
  react/                  # React 专属组件与框架适配
  vue/                    # Vue 专属组件与框架适配
  tooling/                # ESLint、TypeScript 等工程配置

scripts/                  # 仓库级校验和代码生成脚本
docs/                     # 架构、规范、CI 和教学文档
```

判断代码放在哪里时，可以按以下顺序提问：

1. 它只属于某个页面吗？放在该应用的 `pages/<page>`。
2. 它属于一个可识别的业务能力吗？放在 `features/<feature>`。
3. 它只在当前应用复用吗？放在当前应用的 `components`、`hooks`、`composables`
   或 `shared`。
4. 它能跨应用且不依赖框架吗？放在 `packages/shared/*`。
5. 它能跨应用但依赖 React 或 Vue 吗？放在 `packages/react/*` 或
   `packages/vue/*`。

应用之间禁止直接互相导入。共享包也不要通过 `src` 深层路径导入。

推荐：

```ts
import { formatDate } from "@repo/utils";
```

避免：

```ts
import { formatDate } from "@repo/utils/src/date/format-date";
```

## 4. 应用内部如何分层

React 和 Vue 应用使用相同的业务概念：

```txt
src/
  app/                    # 应用启动、路由、Provider、全局 Store
  pages/                  # 路由页面，负责组合业务能力
  features/               # 可识别的业务功能
  components/             # 当前应用复用的公共组件
  hooks/                  # React 应用级复用逻辑
  composables/            # Vue 应用级复用逻辑
  styles/                 # 应用样式入口和 Sass 能力
  test/                   # 测试全局配置

e2e/                      # Playwright 端到端业务场景
playwright.config.ts      # 应用 E2E 地址和报告目录
```

### app

`app` 是应用装配层。这里可以放：

- Router 创建和路由模块组合。
- Pinia、Provider 等应用插件注册。
- 应用级 Store。
- 请求客户端和运行时配置单例。
- 全局错误处理。

不要把普通业务组件或接口请求堆进 `app`。

### pages

页面与路由一一对应，主要负责：

- 读取 URL 参数。
- 组织页面布局。
- 组合一个或多个 Feature。
- 处理页面级错误、空状态和权限结果。

页面应保持薄。可复用业务逻辑优先下沉到 Feature。

### features

Feature 表达一个完整业务能力，例如：

```txt
features/
  user-management/
  order-query/
  permission-settings/
```

Feature 可以按实际需要增加：

```txt
feature-name/
  components/
  hooks/ | composables/
  store/
  api/
  model/
```

不要预先创建空目录。只有出现真实职责时再增加。

## 5. 第一项实践：创建业务页面

下面以“账号中心”页面为例。React 和 Vue 任选一套跟随操作。

如果需要创建全新的业务应用，先执行：

```bash
pnpm g app \
  --name admin-web \
  --framework react \
  --display-name "运营管理后台" \
  --dry-run
```

确认计划后移除 `--dry-run`，再运行：

```bash
pnpm install
pnpm dev:app admin-web
```

端口未提供时会自动选择首个未占用端口。完整参数和版本管理命令见
[`../conventions/code-generation.md`](../conventions/code-generation.md)。

新应用创建后不受名称限制。代码生成器会根据该应用 `package.json` 中直接声明的
React 或 Vue 依赖识别框架，例如可以继续执行：

```bash
pnpm g component --app admin-web --scope app --name app-header
```

框架识别遵循以下规则：

- 应用包名必须为 `@apps/<应用目录名>`。
- React 应用必须直接声明 `react` 依赖。
- Vue 应用必须直接声明 `vue` 依赖。
- 同一个应用不能同时直接声明 `react` 和 `vue`，否则生成器会拒绝继续执行。
- 框架识别不依赖应用名，因此不要求名称包含 `react` 或 `vue`。

创建应用后，可以继续生成完整的业务结构：

```bash
pnpm g feature --app admin-web --name account-center
pnpm g page --app admin-web --name account-detail
pnpm g component --app admin-web --scope app --name app-header
pnpm g store --app admin-web --name user-session
pnpm g hook --app admin-web --name pagination
```

Vue 应用应把最后一条替换为：

```bash
pnpm g composable --app portal-web --name pagination
```

### 5.1 生成 Feature

React：

```bash
pnpm g feature --app react-web --name account-center
```

Vue：

```bash
pnpm g feature --app vue-web --name account-center
```

命令会创建 Feature 入口、目录导出和测试。

正式生成前可以先预览：

```bash
pnpm g feature --app react-web --name account-center --dry-run
```

### 5.2 生成 Page

React：

```bash
pnpm g page --app react-web --name account-center
```

Vue：

```bash
pnpm g page --app vue-web --name account-center
```

生成器不会自动修改路由。路由的路径、权限和布局属于业务决定，需要开发者明确配置。

### 5.3 注册路由

在对应应用中新增路由模块：

```txt
src/app/router/routes/account-center.routes.tsx
src/app/router/routes/account-center.routes.ts
```

页面默认使用动态导入，避免所有页面进入首屏包。

React 示例：

```tsx
{
  path: "/account",
  lazy: async () => {
    const { AccountCenterPage } = await import(
      "@/pages/account-center"
    );

    return { Component: AccountCenterPage };
  },
}
```

Vue 示例：

```ts
{
  path: "/account",
  name: "account-center",
  component: () => import("@/pages/account-center/AccountCenterPage.vue"),
  meta: {
    title: "账号中心",
  },
}
```

随后将路由模块加入应用 Router 的路由列表。

### 5.4 在 Page 中组合 Feature

页面只负责组合，不复制 Feature 内部逻辑。

React 示例：

```tsx
import { AccountCenter } from "@/features/account-center";

export function AccountCenterPage() {
  return (
    <main>
      <AccountCenter />
    </main>
  );
}
```

Vue 示例：

```vue
<script setup lang="ts">
import { AccountCenter } from "@/features/account-center";
</script>

<template>
  <main>
    <AccountCenter />
  </main>
</template>
```

## 6. 生成组件和复用逻辑

### 6.1 应用公共组件

```bash
pnpm g component \
  --app react-web \
  --scope app \
  --name app-header
```

适合只在当前应用复用的布局或业务无关组件。

### 6.2 Feature 内组件

Feature 必须先存在：

```bash
pnpm g component \
  --app vue-web \
  --scope feature \
  --feature account-center \
  --name profile-form
```

### 6.3 Page 内组件

```bash
pnpm g component \
  --app react-web \
  --scope page \
  --page account-center \
  --name account-summary
```

Page 内组件只服务当前页面。如果开始被其他页面使用，应考虑移动到 Feature 或应用公共
组件目录。

### 6.4 React Hook

```bash
pnpm g hook --app react-web --name pagination
```

生成到 Feature：

```bash
pnpm g hook \
  --app react-web \
  --scope feature \
  --feature account-center \
  --name profile-form
```

### 6.5 Vue Composable

```bash
pnpm g composable --app vue-web --name pagination
```

生成到 Page：

```bash
pnpm g composable \
  --app vue-web \
  --scope page \
  --page account-center \
  --name page-title
```

生成器默认创建测试、拒绝覆盖已有文件，并支持：

```bash
--dry-run
--skip-test
```

除非常薄的临时代码外，不建议使用 `--skip-test`。

## 7. 状态应该放在哪里

不要看到“状态”就创建 Store。

| 状态类型                      | 推荐位置                        |
| ----------------------------- | ------------------------------- |
| 单个组件展开、弹窗、输入值    | React/Vue 组件本地状态          |
| 筛选、分页、排序、当前详情 ID | URL params 或 query             |
| Feature 内多个组件共享的状态  | Feature Store                   |
| 跨 Feature 的应用外壳状态     | `app/store`                     |
| HTTP 请求结果                 | Feature 数据层或请求缓存方案    |
| 运行时环境配置                | `@repo/config` 解析后的配置对象 |

生成应用 Store：

```bash
pnpm g store --app react-web --name user-session
pnpm g store --app vue-web --name user-session
```

React 使用 Zustand 时应通过精确选择器订阅：

```tsx
const sidebarOpen = useAppStore((state) => state.sidebarOpen);
```

不要默认订阅整个 Store：

```tsx
const appState = useAppStore();
```

Vue 从 Pinia 解构响应式状态时使用 `storeToRefs`，Action 直接从 Store 调用。

## 8. 请求和环境变量

### 8.1 不要在组件中重复创建请求客户端

请求客户端和运行时配置已经在应用启动层创建为单例。Feature 应复用应用提供的客户端，
不要在每个组件渲染或 Composable 调用时重新创建。

共享请求能力位于：

```txt
packages/shared/request/
```

运行时配置解析位于：

```txt
packages/shared/config/
```

### 8.2 环境文件

每个应用独立维护：

```txt
.env
.env.development
.env.test
.env.uat
.env.production
.env.local             # 本机覆盖，不提交
```

通用值放 `.env`，不同环境的值放 `.env.<mode>`。

只有 `VITE_` 前缀变量会进入浏览器代码。任何 Token、密码和私钥都不能放入
`VITE_*`。

本地代理相关变量：

```env
DEV_PROXY_PREFIX=/api
DEV_PROXY_TARGET=http://localhost:3000
```

代理在 `vite.config.ts` 中配置，不在命令行中临时拼接。

## 9. 样式如何选择

当前项目同时支持 Tailwind CSS 4、Sass 和 Design Token。

### Tailwind

适合：

- 页面布局。
- 间距、排版和常用视觉属性。
- Feature 内快速组合。

```tsx
<section className="grid gap-4 p-6">
  <h1 className="text-xl font-semibold">账号中心</h1>
</section>
```

Tailwind 4 使用自动内容检测，当前不需要 `tailwind.config.js`。

### Sass

适合：

- 复杂选择器。
- mixin、函数和计算。
- 第三方组件库样式覆盖。
- React CSS Module 或 Vue scoped style。

Vue 示例：

```vue
<style scoped lang="scss">
.account-panel {
  &__title {
    font-weight: 700;
  }
}
</style>
```

### Design Token

共享 UI 组件默认使用 `@repo/design-tokens` 提供的 CSS 变量。应用可以：

- 直接使用默认 Token。
- 覆盖已有 `--repo-*` 变量。
- 完全维护自己的应用样式。

不要在共享 UI 包中读取某个应用专属的 CSS 变量、Store 或 Router。

## 10. 共享能力如何新增

### 框架无关能力

纯函数、配置、请求、权限规则等放入：

```txt
packages/shared/<package-name>/
```

共享包应该：

- 职责单一。
- 提供 `src/index.ts` 公共入口。
- 不依赖 React 或 Vue。
- 有单元测试和 README。
- 不暴露内部实现目录。

### React/Vue 专属能力

React 专属：

```txt
packages/react/<package-name>/
```

Vue 专属：

```txt
packages/vue/<package-name>/
```

共享 UI 组件可以通过生成器创建：

```bash
pnpm g component --framework react --scope ui --name data-table
pnpm g component --framework vue --scope ui --name data-table
```

生成器会同步维护组件 barrel 和 `package.json exports`。

## 11. 如何写测试

测试文件与源码放在一起。

### 纯函数

```ts
import { describe, expect, it } from "vitest";

describe("formatAmount", () => {
  it("formats a number as currency", () => {
    expect(formatAmount(100)).toBe("¥100.00");
  });
});
```

### 组件

React 和 Vue 都优先通过用户可见语义查询：

1. `getByRole`
2. `getByLabelText`
3. `getByText`
4. 最后才使用 `data-testid`

测试用户行为，不读取组件内部 state、ref 或私有方法。

运行全部测试：

```bash
pnpm test
```

只运行应用测试：

```bash
pnpm --filter @apps/react-web test
pnpm --filter @apps/vue-web test
```

生成覆盖率：

```bash
pnpm --filter @apps/react-web test:coverage
pnpm --filter @apps/vue-web test:coverage
```

首次运行 E2E 时安装 Chromium，然后执行双应用冒烟：

```bash
pnpm test:e2e:install
pnpm test:e2e
```

只运行一个应用或打开可视化调试界面：

```bash
pnpm test:e2e:react
pnpm --filter @apps/vue-web test:e2e:ui
```

E2E 测试放在应用自己的 `e2e/`，通过用户可见行为验证真实浏览器流程。登录夹具、
测试数据和页面对象也应留在对应应用；浏览器、重试和报告策略由
`@repo/playwright-config` 统一维护。

页面只有在处理路由参数、权限、多个 Feature 编排或关键业务分支时，才需要单独增加
页面级测试。纯组合页面通常不重复测试。

## 12. 代码注释要求

新增代码需要用中文说明：

- 模块职责。
- 关键流程。
- 特殊边界。
- 为什么采用当前实现。
- 测试保护的行为。
- 后续扩展时需要注意的约束。

不要把代码逐行翻译成注释。以下注释没有维护价值：

```ts
// 将 count 加一。
count += 1;
```

JSON 文件不添加注释。完整规范见
[`../conventions/code-comments.md`](../conventions/code-comments.md)。

## 13. 提交前检查

日常开发至少执行：

```bash
pnpm lint
pnpm typecheck
pnpm test
```

修改构建、依赖、路由懒加载或样式入口后，再执行：

```bash
pnpm lint:unused
pnpm build
```

完整检查命令：

```bash
pnpm format:check
pnpm lint
pnpm lint:unused
pnpm typecheck
pnpm test
pnpm build
```

其中：

- `lint`：检查命名、ESLint 和 Stylelint。
- `lint:unused`：使用 Knip 检查未使用文件、导出和依赖。
- `typecheck`：检查所有应用和包的 TypeScript 类型。
- `test`：运行生成器、共享包、UI 包和应用测试。
- `test:e2e`：自动启动应用并运行 Chromium 端到端测试。
- `build`：构建两套应用，产物位于各自的 `dist/`。

## 14. 日常开发工作流

一个普通业务需求推荐按以下顺序推进：

1. 明确需求属于 React 应用、Vue 应用还是共享能力。
2. 判断代码属于 Page、Feature、应用公共能力还是 Workspace Package。
3. 使用 `pnpm g ... --dry-run` 预览生成计划。
4. 生成模块并补充业务实现。
5. 优先编写纯函数和状态测试，再补组件关键行为测试。
6. 本地运行目标应用，验证路由、接口、样式和错误状态。
7. 执行 `pnpm lint`、`pnpm typecheck` 和 `pnpm test`。
8. 涉及依赖或构建时执行 `pnpm lint:unused` 和 `pnpm build`。
9. 提交时使用符合 Conventional Commits 的说明。

常见提交类型：

```txt
feat: 增加新业务能力
fix: 修复缺陷
refactor: 调整实现但不改变行为
test: 增加或调整测试
docs: 修改文档
chore: 调整工具链或工程配置
```

不要在一个提交中混入无关重构、格式化和依赖升级。变更范围越清晰，Code Review 和
问题回滚越容易。

## 15. 工程维护工作流

### 新增依赖

新增依赖前先确认：

1. 仓库是否已有相同能力。
2. 依赖应该属于根工具链、具体应用还是某个 Package。
3. 是否需要两套框架共同使用。
4. 是否值得加入 pnpm catalog 统一版本。

依赖归属原则：

- 只被一个应用使用：声明在该应用。
- 只被一个 Package 使用：声明在该 Package。
- 多个 Workspace 需要统一版本：版本加入 catalog，各使用方仍分别声明。
- ESLint、Prettier、Turbo 等仓库工具：声明在根目录或 tooling 包。

推荐在仓库根目录使用 `--filter` 指定依赖归属。这样无需频繁切换目录，也不会把业务
依赖误写入根 `package.json`：

```bash
# 为 React 应用安装运行时依赖。
pnpm --filter @apps/react-web add axios

# 为 Vue 应用安装开发依赖。
pnpm --filter @apps/vue-web add -D unplugin-auto-import

# 为指定共享包安装依赖。
pnpm --filter @repo/request add ofetch
```

也可以进入目标 Workspace 目录执行命令，效果相同：

```bash
cd apps/react-web
pnpm add axios
```

以上命令只会修改目标 Workspace 的 `package.json`，但整个 Monorepo 仍共同维护根目录的
`pnpm-lock.yaml` 和 pnpm 虚拟存储，这是正常的 Workspace 行为。

只有全仓库共同使用的工程工具才安装到根目录，`-w` 表示明确修改 Workspace Root：

```bash
pnpm add -Dw <工程工具包名>
```

如果依赖版本已经由 `pnpm-workspace.yaml` 的 catalog 管理，使用方仍要在自己的
`package.json` 中声明，安装时使用 `catalog:`：

```bash
pnpm --filter @apps/react-web add react@catalog:
pnpm --filter @apps/vue-web add vue@catalog:
```

准备让多个 Workspace 共用的新依赖，应先在 `pnpm-workspace.yaml` 的 `catalog` 中登记
版本，再分别为实际使用它的应用或 Package 添加 `catalog:` 声明。不要因为版本由 catalog
统一，就把业务依赖安装到根目录。

当前业务应用已经预置并由 catalog 统一版本：

- React 应用：`ahooks`、`lodash`。
- Vue 应用：`@vueuse/core`、`lodash`。
- TypeScript 类型：使用 `lodash` 的 Workspace 同时声明 `@types/lodash`。

业务代码使用 `lodash` 时优先按方法路径导入，例如 `lodash/startCase`，避免因为整包导入扩大
构建产物体积。

完成后执行：

```bash
pnpm lint:unused
pnpm typecheck
pnpm test
pnpm build
```

### 新增共享 Package

新增 Package 时需要：

1. 根据是否依赖框架选择 `packages/shared`、`packages/react` 或 `packages/vue`。
2. 使用 kebab-case 目录名和符合分层规则的 package name。
3. 添加 `package.json`、`tsconfig.json`、`src/index.ts` 和 README。
4. 提供标准的 build、lint、typecheck、test、clean scripts。
5. 只通过 `package.json exports` 暴露稳定公共 API。
6. 补充单元测试和使用示例。
7. 运行 `pnpm lint:naming` 验证目录与包名。

### 新增业务应用

优先使用应用生成器，不要复制已有应用后直接修改：

```bash
pnpm g app --name admin-web --framework react
pnpm install
```

生成后仍需要按业务确认：

- `package.json` 名称遵循 `@apps/<app-name>`。
- 独立环境文件、端口和运行时配置。
- Vite、Vitest、TypeScript 和 ESLint 配置。
- Router、状态库、错误边界和请求客户端单例。
- Turbo 任务能识别 build、lint、typecheck 和 test。
- README 和本指南补充启动命令与产物位置。

应用版本升级使用：

```bash
pnpm version:app --app admin-web --bump patch
```

进入应用目录后，也可以使用应用 `package.json` 自带的快捷命令：

```bash
cd apps/admin-web
pnpm version:patch
pnpm version:minor
pnpm version:major
pnpm version:set 1.2.0
```

这些命令会直接修改当前应用 `package.json` 的 `version` 字段。新生成的 React 和
Vue 应用也会自动包含相同脚本。

该命令不会自动提交或创建 Git Tag。

版本号必须使用完整 SemVer，例如：

```txt
1.2.3
1.2.3-beta.1
1.2.3+build.5
```

不接受以下写法：

```txt
v1.2.3
1.2
1.0.0-01
1.0.0-alpha.01
```

数字形式的预发布标识不能包含前导零。版本递增支持超过 JavaScript 安全整数范围的
超大版本段，不会因为数字精度导致错误结果。

修改应用模板、版本脚本或代码生成器后，执行：

```bash
pnpm verify:app-templates
```

该命令会真实生成临时 React 和 Vue 应用，并验证 lint、类型检查、测试、构建、应用版本
命令以及自定义应用名下的组件生成。验证结束后会删除临时应用。

### 升级 Node、pnpm 或核心构建工具

升级需要在同一个变更中同步：

- `package.json` 的 engines 和 packageManager。
- `.nvmrc` 与 `.node-version`。
- `pnpm-workspace.yaml` catalog。
- `pnpm-lock.yaml`。
- 运行时版本、Vite 和相关教学文档。

升级后必须完成全量检查，不只运行单个应用。

### 修改共享工程配置

调整 `packages/tooling`、根 ESLint、Stylelint、Prettier 或 Vite 公共规则时：

1. 先说明规则要解决的真实问题。
2. 评估 React、Vue、共享包和 Node 脚本的影响范围。
3. 避免通过全局 ignore 掩盖已有错误。
4. 更新对应规范文档。
5. 执行全仓检查。

## 16. 项目维护责任

不同目录的主要维护责任：

| 目录                 | 主要责任                                    |
| -------------------- | ------------------------------------------- |
| `apps/*`             | 业务团队，负责页面、Feature、路由和应用装配 |
| `packages/shared/*`  | 公共能力维护者，保证框架无关和 API 稳定     |
| `packages/react/*`   | React 基础能力维护者                        |
| `packages/vue/*`     | Vue 基础能力维护者                          |
| `packages/tooling/*` | 工程维护者，负责统一编译与代码规范          |
| `scripts/*`          | 工程维护者，负责生成器和仓库校验脚本        |
| `docs/*`             | 所有贡献者，代码行为变化时同步更新文档      |

共享能力的变更影响范围通常大于应用内部变更。修改共享 Package 或 tooling 前，应检查所有
消费者，并在 Merge Request 中说明兼容性和迁移方式。

## 17. 常见问题

### pnpm install 提示 Node 版本不满足

切换到 `>=22.12.0` 的 Node.js，推荐使用 `.nvmrc` 中的版本，然后重新执行：

```bash
corepack enable
pnpm install
```

### 修改代码后应用没有更新

确认：

1. 启动的是正确应用。
2. 文件位于对应应用的 `src` 或它实际依赖的 Workspace 包。
3. 浏览器访问的是正确端口。
4. 终端没有 TypeScript 或 Vite 编译错误。

必要时停止服务后重新运行对应 `pnpm dev:*` 命令。

### pnpm build 后根目录没有 dist

这是正常行为。产物分别位于：

```txt
apps/react-web/dist/
apps/vue-web/dist/
```

### Knip 报未使用文件或依赖

优先确认它是否确实可以删除。只有由 Vite、配置字符串或其他动态机制加载时，才增加
最小范围忽略规则。不要直接忽略整个应用或 packages 目录。

### 生成器提示目标文件已存在

生成器不会覆盖已有文件。请：

1. 确认名称是否输入正确。
2. 检查现有模块是否可以直接扩展。
3. 需要替换时由开发者手动评估和修改，不要删除文件后盲目重新生成。

### 自定义名称应用无法继续生成代码

先检查应用目录和包名是否一致：

```txt
目录：apps/admin-web
包名：@apps/admin-web
```

然后检查 `package.json` 是否直接声明了目标框架依赖。React 应用需要 `react`，Vue
应用需要 `vue`。不要在同一应用中同时直接声明两个框架。

可以先执行 dry-run 查看错误：

```bash
pnpm g component \
  --app admin-web \
  --scope app \
  --name app-header \
  --dry-run
```

### 应用版本命令提示 SemVer 无效

使用完整的 `主版本.次版本.补丁版本`：

```bash
pnpm version:app --app admin-web --set 1.2.3
```

不要添加 `v` 前缀，也不要省略补丁位。预发布版本中的纯数字标识不能有前导零，例如
`1.0.0-beta.1` 合法，`1.0.0-beta.01` 非法。

正式修改前可以预览：

```bash
pnpm version:app --app admin-web --bump patch --dry-run
```

### 应用同时声明 React 和 Vue 后生成器报错

这是主动保护，不是生成器故障。业务应用必须明确属于 React 或 Vue 技术栈，不能依靠
生成器猜测应该输出 `.tsx` 还是 `.vue`。

如果另一个框架只是间接依赖，不要把它直接加入应用 `dependencies`。如果确实需要双框架
运行时，应将该应用视为特殊架构单独设计，不使用当前标准业务生成器。

### 新页面生成后无法访问

生成 Page 不会自动注册路由。需要在 `src/app/router/routes` 中增加路由模块，并组合
到 Router。

### Tailwind 类没有生效

确认：

1. 类名是完整字符串，没有使用 `text-${color}-500` 等动态拼接。
2. 应用入口导入了 `styles/tailwind.css`。
3. `vite.config.ts` 注册了 `@tailwindcss/vite`。

### Sass 变量不可用

检查变量或 mixin 是否通过 `src/styles/abstracts/index.scss` 使用 `@forward` 暴露。
Vite 只会自动注入这个入口。

## 18. 推荐的第一周学习顺序

### 第一天

- 安装并启动一套应用。
- 阅读本指南第 1 至 5 节。
- 使用 `--dry-run` 体验生成器。
- 找到首页对应的 Page、Feature 和路由模块。

### 第二天

- 阅读应用目录、状态与路由规范。
- 创建一个 Feature 内组件。
- 为组件增加一次用户交互和组件测试。

### 第三天

- 阅读环境变量、请求和可靠性规范。
- 跟踪运行时配置和请求客户端从应用入口到 Feature 的使用路径。

### 第四天

- 阅读 Tailwind、Sass 和 Design Token 规范。
- 完成一个同时使用 utility 和共享 Token 的页面区域。

### 第五天

- 阅读 package 边界和依赖健康规范。
- 执行完整检查命令。
- 尝试解释一个功能为什么属于 app、page、feature 或 package。

## 19. 规范索引

| 主题           | 文档                                                                                 |
| -------------- | ------------------------------------------------------------------------------------ |
| 项目整体架构   | [`../../README.md`](../../README.md)                                                 |
| 后续阶段路线图 | [`../roadmap/foundation-roadmap.md`](../roadmap/foundation-roadmap.md)               |
| 应用目录职责   | [`../conventions/application-structure.md`](../conventions/application-structure.md) |
| Package 边界   | [`../conventions/package-boundaries.md`](../conventions/package-boundaries.md)       |
| 代码生成器     | [`../conventions/code-generation.md`](../conventions/code-generation.md)             |
| 命名规范       | [`../conventions/naming.md`](../conventions/naming.md)                               |
| 代码注释       | [`../conventions/code-comments.md`](../conventions/code-comments.md)                 |
| 环境变量       | [`../conventions/environment-variables.md`](../conventions/environment-variables.md) |
| Vite 与构建    | [`../conventions/vite.md`](../conventions/vite.md)                                   |
| 状态与路由     | [`../conventions/state-and-routing.md`](../conventions/state-and-routing.md)         |
| 测试           | [`../conventions/testing.md`](../conventions/testing.md)                             |
| Tailwind       | [`../conventions/tailwind.md`](../conventions/tailwind.md)                           |
| Sass           | [`../conventions/sass.md`](../conventions/sass.md)                                   |
| Stylelint      | [`../conventions/stylelint.md`](../conventions/stylelint.md)                         |
| 权限           | [`../conventions/authorization.md`](../conventions/authorization.md)                 |
| 请求与错误处理 | [`../conventions/reliability.md`](../conventions/reliability.md)                     |
| 依赖健康       | [`../conventions/dependency-health.md`](../conventions/dependency-health.md)         |
| VS Code        | [`../conventions/vscode.md`](../conventions/vscode.md)                               |

完成本指南后，新同事应该能够独立判断代码归属、创建基础业务模块、运行测试并通过提交前
检查。遇到架构边界不确定时，先查看对应规范，再在 Code Review 中明确讨论，不要通过
复制现有代码猜测规则。
