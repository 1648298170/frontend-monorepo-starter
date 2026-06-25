# 状态库与路由集成规范

React 应用使用 Zustand 和 React Router，Vue 应用使用 Pinia 和 Vue Router。两套模板
保持相同的架构边界，但遵循各自框架的原生使用方式。

## 总体原则

- 路由负责页面定位、URL 状态、访问入口和页面级懒加载。
- Store 负责跨组件、跨页面且无法自然放入 URL 的客户端状态。
- 服务端数据优先由请求缓存方案管理，不复制到全局 Store。
- 表单输入优先放组件或 feature 内部，不默认进入全局 Store。
- 筛选、分页、排序和当前 Tab 等可分享状态优先写入 URL。
- 应用级基础设施放在 `app`，具体业务能力放在 `features`。

## 目录规划

React：

```txt
src/
├─ app/
│  ├─ router/
│  │  ├─ index.tsx
│  │  ├─ route-meta.ts
│  │  └─ routes/
│  │     └─ home.routes.tsx
│  └─ store/
│     ├─ index.ts
│     └─ app.store.ts
├─ features/
│  └─ <feature>/
│     ├─ store/
│     └─ ...
└─ pages/
```

Vue：

```txt
src/
├─ app/
│  ├─ router/
│  │  ├─ index.ts
│  │  ├─ route-meta.d.ts
│  │  ├─ guards/
│  │  │  └─ index.ts
│  │  └─ routes/
│  │     └─ home.routes.ts
│  └─ store/
│     ├─ index.ts
│     └─ app.store.ts
├─ features/
│  └─ <feature>/
│     ├─ store/
│     └─ ...
└─ pages/
```

## Store 分层

### 组件状态

只影响单个组件或很小的组件树时，使用框架本地状态：

- React：`useState`、`useReducer`。
- Vue：`shallowRef`、`ref`、`reactive`。

例如弹窗内输入值、按钮 loading、局部展开状态，不应直接创建全局 Store。

### Feature 状态

属于一个业务能力，并在该 feature 的多个组件或页面之间复用时，放入：

```txt
features/<feature>/store/
```

例如：

- 编辑器草稿。
- 多步骤业务流程状态。
- 购物车或待提交批次。
- 一个业务域内部共享的客户端选择状态。

Feature Store 不应从 `app/store` 导出，消费方应从 feature 的公开入口导入。

### 应用级状态

跨 feature 的应用外壳状态放入 `app/store`，例如：

- 侧边栏展开状态。
- 全局主题或密度设置。
- 当前用户会话摘要。
- 应用级通知中心状态。

当前 `app.store` 只提供侧边栏状态，作为目录和 API 约定示例。没有真实需求时不要继续
向该 Store 堆积字段。

## 不应该进入 Store 的状态

| 状态                 | 推荐位置                       |
| -------------------- | ------------------------------ |
| 列表筛选、排序、分页 | URL query                      |
| 当前详情 ID          | URL params                     |
| 页面 Tab             | URL path 或 query              |
| 单个表单输入         | 组件或 feature composable/hook |
| HTTP 请求结果        | 请求缓存层或 feature 数据层    |
| Vite 环境变量        | `@repo/config` 解析结果        |
| React/Vue 组件实例   | 组件 ref                       |

Store 不是所有状态的默认容器。只有状态生命周期和共享范围确实超过组件边界时才使用。

## React Zustand 规范

Zustand 不需要 Provider，Store 可以直接通过 hook 使用：

```tsx
const sidebarOpen = useAppStore((state) => state.sidebarOpen);
const toggleSidebar = useAppStore((state) => state.toggleSidebar);
```

选择器应尽量精确，不要默认订阅整个 Store：

```tsx
// 推荐
const sidebarOpen = useAppStore((state) => state.sidebarOpen);

// 避免：任何字段变化都会触发该组件更新
const appState = useAppStore();
```

Action 和状态放在同一个 Store 契约中，组件不直接调用底层 `setState`。异步 Action
负责协调状态变更，但 API 客户端仍由 feature 数据层提供。

持久化、Immer、DevTools 等中间件不默认开启。出现主题设置、长期草稿等明确持久化
需求时，再针对具体 Store 引入。

## Vue Pinia 规范

Pinia 实例在 `app/store/index.ts` 中创建并显式导出：

```ts
export const pinia = createPinia();
```

应用启动顺序必须是：

```ts
app.use(pinia);
registerRouterGuards(router);
app.use(router);
app.mount("#app");
```

Pinia 在 Router 之前安装，确保未来导航守卫读取 Store 时不会出现
`getActivePinia()` 错误。

模板采用 Setup Store。所有 `ref`、`shallowRef`、`computed` 状态都必须从 Store 返回，
确保 DevTools、插件和未来 SSR 能正确识别。

组件需要解构状态时使用 `storeToRefs`：

```ts
const appStore = useAppStore();
const { sidebarOpen } = storeToRefs(appStore);
```

Action 可以直接从 Store 调用，不要用 `storeToRefs` 包裹函数。

## 路由模块化

路由实例只负责组合路由模块：

```txt
router/index
  ├─ home.routes
  ├─ account.routes
  └─ system.routes
```

新增业务域时创建独立的 `<feature>.routes` 文件，不把所有页面堆进 `router/index`。

路由模块应满足：

- 页面默认使用动态导入。
- path、name 和 meta 在同一处声明。
- 路由文件不执行 API 请求。
- 路由文件不在模块顶层读取 Store。
- 页面组件保持薄，只负责组合 feature。

## 页面懒加载

React Router：

```tsx
{
  path: "/users",
  lazy: async () => {
    const { UsersPage } = await import("@/pages/users/UsersPage");
    return { Component: UsersPage };
  },
}
```

Vue Router：

```ts
{
  path: "/users",
  component: () => import("@/pages/users/UsersPage.vue"),
}
```

只有应用外壳、错误边界等首屏必需模块可以同步导入。

## 路由元信息

两套应用统一规划以下字段：

```ts
interface RouteMeta {
  title?: string;
  requiresAuth?: boolean;
  permissions?: string[];
}
```

- `title`：页面标题。
- `requiresAuth`：是否要求登录。
- `permissions`：进入页面需要的权限编码。

当前只实现 `title`。认证和权限字段是稳定契约，但在认证模块出现前不添加虚假跳转。

## 页面标题

React 使用 route `handle` 携带元信息，根 `App` 从 `useMatches()` 读取最深层标题。

Vue 使用类型增强后的 `RouteMeta`，全局 `beforeEach` 在导航时设置标题。

未来需要“页面标题 - 应用名称”格式时，应在标题处理器统一拼接，不在每个页面手写。

## 认证与权限规划

认证模块实现后：

React：

- 会话状态放入独立 `features/auth/store`。
- 路由保护使用 React Router loader。
- loader 返回 `redirect()`，不在页面组件的 effect 中跳转。
- 权限检查复用纯函数，不直接耦合 UI。

Vue：

- 会话状态放入独立 `features/auth/store`。
- 在 `registerRouterGuards()` 中调用 Store。
- 使用返回值进行跳转，不使用 `next()`。
- 登录路由必须排除认证重定向，防止循环跳转。
- 异步会话恢复必须 `await` 并处理失败状态。

两套应用都应保留原目标地址，登录后回到用户最初访问的页面。

## 路由错误与加载状态

业务页面增加后，应按框架补充：

- React Router route `errorElement`。
- Vue Router 动态导入错误处理和应用级错误页。
- 路由切换 loading 只表现导航状态，不与业务请求 loading 混用。

在没有真实加载体验和错误页设计前，不添加占位 spinner 或空错误组件。

## 命名约定

- React Store：`useXxxStore`。
- Vue Store：`useXxxStore`。
- Store 文件：`xxx.store.ts`。
- 路由模块：`xxx.routes.ts` 或 `xxx.routes.tsx`。
- Vue 守卫注册器：`registerXxxGuard`。
- 路由名称使用稳定的小写业务名，例如 `home`、`user-detail`。
- 权限编码由后端契约确定，不在前端随意发明。

## 新增业务模块流程

1. 在 `features/<feature>` 建立业务能力。
2. 判断状态应放组件、URL、feature Store 还是应用 Store。
3. 在 `pages` 创建薄页面组件。
4. 在 `app/router/routes` 新增路由模块。
5. 使用动态导入加载页面。
6. 声明 title、认证和权限元信息。
7. 将路由模块组合进路由实例。
8. 为 Store 纯逻辑和路由保护逻辑增加测试。
9. 执行 `pnpm lint`、`pnpm typecheck`、`pnpm test` 和 `pnpm build`。
