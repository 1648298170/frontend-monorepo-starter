# @repo/react-auth

React 权限适配包，基于 `@repo/auth` 提供 Provider、Hook 和视图 Guard。

```txt
src/
  components/
    permission-provider/
    permission-guard/
  context/
  hooks/
  test/
  index.ts
```

## 应用接入

应用负责从 Zustand、接口或登录会话取得权限，再注入 Provider：

```tsx
import { PermissionProvider } from "@repo/react-auth";

<PermissionProvider permissions={currentUser.permissions}>
  <App />
</PermissionProvider>;
```

组件可以使用 Guard：

```tsx
<PermissionGuard
  permissions={["user:update"]}
  fallback={<span>无编辑权限</span>}
>
  <button type="button">编辑用户</button>
</PermissionGuard>
```

逻辑代码可以使用 Hook：

```ts
const canApprove = usePermission(["order:approve", "order:admin"], "any");
```

该包只控制前端展示和交互，不能替代服务端鉴权。
