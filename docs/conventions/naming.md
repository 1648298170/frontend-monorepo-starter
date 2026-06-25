# 命名规范

本规范面向 React、Vue 和共享包，目标是让文件可预测、代码易搜索、脚手架可生成，并
避免在双技术栈 Monorepo 中出现多套互相冲突的命名方式。

治理原则：

- 自动化只覆盖稳定、低误报的规则。
- 业务语义是否准确由 Code Review 判断。
- 不为后端字段、第三方 SDK 和框架约定制造兼容成本。
- 新规则先写入本文档，再评估是否适合自动阻断。

## 第一阶段：已实施

### 目录命名

应用和共享包的 `src` 业务目录统一使用 `kebab-case`：

```txt
features/user-management/
pages/order-detail/
shared/form-validation/
```

允许框架组件文件使用 PascalCase，但目录仍保持 kebab-case：

```txt
components/metric-card/MetricCard.tsx
components/metric-card/MetricCard.vue
```

该规则由 `eslint-plugin-check-file` 自动检查。

### 文件命名

| 文件职责   | 命名规则                      | 示例                    |
| ---------- | ----------------------------- | ----------------------- |
| React 组件 | `PascalCase.tsx`              | `UserProfile.tsx`       |
| Vue 组件   | `PascalCase.vue`              | `UserProfile.vue`       |
| 页面组件   | `XxxPage.tsx` / `XxxPage.vue` | `UserDetailPage.tsx`    |
| Store      | `kebab-case.store.ts`         | `user-session.store.ts` |
| 路由模块   | `kebab-case.routes.ts(x)`     | `user.routes.tsx`       |
| 类型文件   | `kebab-case.types.ts`         | `user.types.ts`         |
| Schema     | `kebab-case.schema.ts`        | `login.schema.ts`       |
| API        | `kebab-case.api.ts`           | `user.api.ts`           |
| Service    | `kebab-case.service.ts`       | `auth.service.ts`       |

第一阶段只检查明确职责文件，不限制所有普通 `.ts` 文件。`main.ts`、`index.ts`、
`useRuntimeConfig.ts` 等文件继续遵循框架和代码语义。

### TypeScript 标识符

| 标识符                       | 命名规则                          |
| ---------------------------- | --------------------------------- |
| interface、type、class、enum | `PascalCase`                      |
| 普通函数                     | `camelCase`                       |
| React 组件函数               | `PascalCase`                      |
| 参数                         | `camelCase`                       |
| 普通变量                     | `camelCase`                       |
| 组件引用                     | `PascalCase`                      |
| 模块常量                     | `UPPER_CASE` 或语义化 `camelCase` |

允许参数和变量使用前导下划线，例如 `_event`，用于表达有意不消费的值。

不检查对象属性命名，以下外部契约都可以保持原样：

```ts
const apiResponse = {
  user_id: "42",
};
```

标识符由 `@typescript-eslint/naming-convention` 自动检查。

### CSS 类名

作者编写的 CSS 类名使用 `kebab-case` 或 BEM：

```css
.user-card {
}
.user-card__title {
}
.user-card--disabled {
}
```

规则不检查 JSX 或 Vue 模板中的 Tailwind utility 字符串。

第三方组件库样式覆盖统一放入：

```txt
src/styles/vendor-overrides/
```

该目录允许使用第三方提供的类名，不执行本仓库的 class pattern 检查。

### Workspace 包名

Workspace 目录和包名必须满足：

| 目录                      | 包名                 |
| ------------------------- | -------------------- |
| `apps/<name>`             | `@apps/<name>`       |
| `packages/shared/<name>`  | `@repo/<name>`       |
| `packages/react/<name>`   | `@repo/react-<name>` |
| `packages/vue/<name>`     | `@repo/vue-<name>`   |
| `packages/tooling/<name>` | `@repo/<name>`       |

同时要求：

- Workspace 目录名称使用 `kebab-case`。
- 包名符合 npm 新包命名规则。
- 包名在仓库中唯一。
- 内部 Workspace 必须设置 `"private": true`。
- 校验范围严格来自 `pnpm-workspace.yaml`。

执行：

```bash
pnpm lint:naming
```

校验脚本位于 `scripts/check-workspace-names.mjs`，规则以配置数组表达。未来增加
`packages/node` 或 `packages/mobile` 时，应添加一条映射规则，不修改通用校验流程。

### 自动化入口

完整 Lint 会先执行 Workspace 命名检查：

```bash
pnpm lint
```

提交前 Hook 执行：

```bash
pnpm exec lint-staged
pnpm lint:naming
pnpm typecheck
pnpm test
```

ESLint 和 Stylelint 由 lint-staged 处理暂存文件，Workspace 结构脚本执行速度较快，
因此每次提交都运行。

## Code Review 检查

以下内容无法仅靠正则可靠判断：

- 名称是否准确表达业务含义。
- 是否滥用 `data`、`list`、`info`、`item` 等模糊词。
- 缩写是否是团队共同理解的术语。
- Store、Service、API 的职责是否与后缀一致。
- 一个名称是否泄漏了不应暴露的实现细节。

推荐：

```ts
const currentUser = {};
const orderItems = [];
function createRequestClient() {}
```

避免：

```ts
const data = {};
const list = [];
function handleData() {}
```

## 第二阶段：已记录，暂未实施

以下规则需要在业务代码增长后，根据实际收益和误报率再决定是否启用。

### Hook 和 Composable 文件名

候选规范：

```txt
useUserSession.ts
useOrderFilters.ts
```

暂不自动检查，因为部分纯函数可能以 `use` 开头但并非 Hook，也可能存在框架迁移和
共享逻辑边界问题。

### 测试文件与源文件关联

候选规范：

```txt
user.store.ts
user.store.test.ts
```

暂不检查测试文件是否一定存在，也不自动推断测试与源文件的对应关系。

### 布尔变量前缀

候选前缀：

```txt
isLoading
hasPermission
canEdit
shouldRefresh
```

暂不强制，因为布尔语义依赖上下文，机械规则容易误伤 API 字段、状态机和第三方类型。

### 权限编码格式

候选格式：

```txt
system:user:read
order:refund:approve
```

必须等待后端权限模型和产品术语稳定后再确定，前端不能单方面发明编码规范。

### 普通 TypeScript 文件名

暂不对所有 `.ts` 文件统一强制 kebab-case 或 camelCase。入口文件、Hook、组件辅助
模块和框架约定存在合理差异。

### 代码生成

第一阶段代码生成器已经实现，可以创建组件、页面、Feature、Store、Hook 和
Composable，并自动复用本文档中的目录与命名约定。具体命令见
[`code-generation.md`](code-generation.md)。

以下能力留到后续按业务需求扩展：

- API 客户端和 Schema 生成。
- 路由文件生成或自动注册。
- 完整 workspace package 生成。

路由自动注册当前不实现，因为布局、权限和路由元信息包含业务语义。后续扩展生成器时
仍必须复用本文档约定，不能形成另一套隐式规范。

## 扩展规则的流程

新增自动化命名规则前需要满足：

1. 规则在多个模块中反复出现。
2. 正确与错误能够由工具稳定判断。
3. 对外部契约和第三方代码有明确豁免方式。
4. 仓库现有代码可以一次性完成迁移。
5. 文档、自动检查和示例同时更新。

如果规则依赖业务语义或会产生大量 disable 注释，应保留为 Code Review 规范。
