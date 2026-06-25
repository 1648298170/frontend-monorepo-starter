# 前端权限架构

## 分层

权限能力分为三层：

```txt
@repo/auth
  纯权限判断规则

@repo/react-auth
  React Provider、Hook、PermissionGuard

@repo/vue-auth
  Vue Provider、Composable、PermissionGuard
```

应用负责用户身份、权限获取、登录失效和路由跳转。公共包不读取 Zustand、
Pinia 或具体接口。

## 权限码

推荐格式：

```txt
资源:动作
```

示例：

```txt
user:read
user:update
order:approve
system:settings
```

权限码应由业务域集中声明，避免在组件中散落无法追踪的字符串。后续真实业务
接入时，可以在应用或业务 package 中定义 `permissions.ts` 常量。

## 匹配模式

- `all`：默认值，要求全部权限都存在。
- `any`：要求至少一个权限存在。
- 空权限要求：视为公开内容。

## 应用接入

登录完成后，应用从用户会话或 Store 获取权限数组，并传入框架 Provider。
Provider 应放在需要使用权限能力的组件树上层。

Provider 会将权限数组预处理为稳定的 `Set`：

- React 只在权限数组引用变化时重新创建。
- Vue 只在权限 Props 变化时重新计算。
- 同一组件树中的 Hook、Composable 和 Guard 共享该 Set。
- 权限判断不再为每一个按钮重复构造查询集合。

React：

```tsx
<PermissionProvider permissions={session.permissions}>
  <RouterProvider router={router} />
</PermissionProvider>
```

Vue：

```vue
<PermissionProvider :permissions="session.permissions">
  <RouterView />
</PermissionProvider>
```

## 使用边界

`PermissionGuard` 适合：

- 控制按钮、菜单和局部业务区域是否展示。
- 权限不足时展示替代说明。
- 降低用户触发无权限操作的概率。

`PermissionGuard` 不适合：

- 代替后端接口鉴权。
- 决定用户真实数据访问范围。
- 在公共包中执行登录跳转。
- 将 Token、用户资料或权限请求写入组件内部。

路由级权限应由应用 Router 守卫读取相同权限数据并完成跳转。共享权限核心仍可
用于判断，但 Router 行为必须留在应用层。
