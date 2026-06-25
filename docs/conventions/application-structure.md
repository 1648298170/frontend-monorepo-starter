# 应用目录结构

React 和 Vue 应用采用相同的业务分层概念，框架实现保持独立。

```txt
src/
  app/
    App.tsx | App.vue
    router.tsx | router.ts
    runtime/
      runtime-services.ts
  pages/
    home/
      HomePage.tsx | HomePage.vue
  features/
    template-overview/
      TemplateOverview.tsx | TemplateOverview.vue
  hooks/                     # React 应用级 Hook
    useRuntimeConfig.ts
  composables/               # Vue 应用级 Composable
    useRuntimeConfig.ts
  shared/                    # 非 Hook/Composable 的应用内共享能力
  styles/
  main.tsx | main.ts
```

## 目录职责

### app

应用装配层，只负责：

- 根组件
- 路由创建
- Provider 或插件注册
- 全局错误处理等应用级能力
- 应用启动时创建的配置、请求客户端等服务单例

这里不实现具体业务页面。

### pages

路由页面层。页面主要组合 feature、处理路由参数和页面级布局，不沉淀可复用的
业务逻辑。

### features

可识别的业务能力，例如用户登录、订单查询、权限配置。每个 feature 应按需包含：

```txt
feature-name/
  components/
  hooks/ | composables/
  model/
  api/
  FeatureEntry.tsx | FeatureEntry.vue
```

只有确实需要时才创建这些子目录，不提前放置空目录。

### shared

仅在当前应用内部复用的能力，例如运行时配置适配、应用级常量和通用布局。能够跨应用、
跨框架复用的代码应提升到 `packages/shared/*`。

### hooks 和 composables

- React 应用使用 `hooks/` 存放跨 feature 使用的应用级 Hook。
- Vue 应用使用 `composables/` 存放跨 feature 使用的应用级 Composable。
- 只属于单个 feature 的 Hook 或 Composable 应放在该 feature 内部。
- 文件使用 `useXxx.ts` 命名，并保持返回接口小而明确。
- 普通纯函数不要包装成 Hook 或 Composable，应放入 `shared` 或
  `packages/shared/*`。

## 依赖方向

推荐依赖方向：

```txt
app -> pages -> features -> app shared -> packages
```

约束：

- 应用之间不互相导入。
- React 应用不依赖 Vue 包，Vue 应用不依赖 React 包。
- `packages/shared/*` 不依赖 React 或 Vue。
- 所有 workspace 包都通过 `package.json exports` 暴露的入口使用。
- 禁止直接导入 `@repo/*/src/*`。

这些规则由 `@repo/eslint-config/boundaries` 自动检查。
