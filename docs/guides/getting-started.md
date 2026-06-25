# 新同事上手指南

这份指南面向第一次接触本仓库的开发同事。目标不是一次读完所有规范，而是在较短时间
内完成以下事情：

1. 正确安装项目依赖。
2. 启动 React 或 Vue 应用。
3. 理解代码应该放在哪一层。
4. 使用生成器创建第一个业务模块。
5. 完成样式、状态、请求和测试开发。
6. 在提交代码前通过项目检查。

建议先完整走一遍“第一天实践”，遇到具体问题时再查看文末的规范索引。

## 1. 开发环境准备

### 1.1 工具版本

本仓库要求：

| 工具    | 版本           | 说明                          |
| ------- | -------------- | ----------------------------- |
| Node.js | `>=22.12.0`    | 推荐使用仓库版本文件指定版本  |
| pnpm    | `10.18.3`      | 唯一允许使用的包管理器        |
| npm     | `>=10.9.0 <11` | 仅随 Node.js 保留，不用于安装 |

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

首次打开时安装工作区推荐扩展，并保留仓库中的格式化、保存行为和 TypeScript 设置。
详细说明见 [`../conventions/vscode.md`](../conventions/vscode.md)。

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
- `build`：构建两套应用，产物位于各自的 `dist/`。

## 14. 常见问题

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

## 15. 推荐的第一周学习顺序

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

## 16. 规范索引

| 主题           | 文档                                                                                 |
| -------------- | ------------------------------------------------------------------------------------ |
| 项目整体架构   | [`../../README.md`](../../README.md)                                                 |
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
