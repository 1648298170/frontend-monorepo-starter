# Package Boundaries

Use package imports instead of deep internal imports.

```ts
import { formatDate } from "@repo/utils";
```

Avoid:

```ts
import { formatDate } from "@repo/utils/src/date";
```

Each package should keep:

- A focused responsibility.
- A `README.md` explaining ownership and intended usage.
- A single public entry at `src/index.ts`.
- Standard scripts: `build`, `lint`, `typecheck`, `test`, and `clean` where applicable.

## Shared package structure

Shared TypeScript packages organize source by capability:

```txt
src/
  capability-name/
    capability.types.ts
    implementation.ts
    implementation.test.ts
    index.ts
  index.ts
```

Rules:

- Keep implementation, types, and tests close to the capability they describe.
- Use the capability `index.ts` as its local public interface.
- Keep the package root `index.ts` limited to aggregate exports.
- Expose only stable capability paths through `package.json` exports.
- Leave implementation-only directories unexported.
- Split by cohesive capability, not by generic folders such as `helpers` or
  `common`.

CSS-only shared packages follow the same principle by grouping files into
cohesive foundations and providing one aggregate entry.

## Tooling package structure

Tooling packages stay flat because each file is already a stable configuration
entry. Split configuration by responsibility and runtime instead of adding
directory levels:

```txt
eslint-config/
  base.js
  browser.js
  node.js
  react.js
  vue.js

tsconfig/
  base.json
  browser.json
  vite-app.json
  library.json
  browser-library.json
  node.json

playwright-config/
  src/
    index.ts
    index.test.ts
```

Framework-neutral base configurations must not implicitly enable browser or
Node.js globals. Consumers compose or extend the environment configuration they
actually need.

Playwright tooling only owns cross-application execution policy. Business
fixtures, accounts, test data and page objects stay inside each application's
`e2e` directory.

## UI package structure

React and Vue UI packages use the same component organization:

```txt
src/
  components/
    component-name/
      ComponentName.tsx | ComponentName.vue
      component-name.types.ts
      component-name.css
      index.ts
    index.ts
  index.ts
```

Rules:

- Keep implementation, types, styles, and tests inside the component directory.
- Use the component directory `index.ts` as that component's public interface.
- Export components from `components/index.ts`, then from the package root.
- Add an explicit package export such as `@repo/react-ui/metric-card` when a stable
  per-component entry is useful.
- Keep framework-independent visual values in `@repo/design-tokens`.
- Do not import another component's internal implementation file.

## Auth package structure

权限能力按框架无关核心和框架适配层拆分：

```txt
packages/shared/auth/       # 纯权限判断
packages/react/auth/        # React Provider、Hook、Guard
packages/vue/auth/          # Vue Provider、Composable、Guard
```

规则：

- `@repo/auth` 不依赖 React、Vue、Router 或应用 Store。
- React/Vue 权限包只将共享规则适配到各自响应式和组件模型。
- 应用负责从登录会话或 Store 获取权限并注入 Provider。
- 权限码由业务域定义，推荐使用 `资源:动作`，例如 `order:approve`。
- 前端 Guard 只控制展示和交互，服务端接口必须独立执行鉴权。
- React 应用和包不得依赖 `@repo/vue-*`，Vue 应用和包不得依赖
  `@repo/react-*`。
