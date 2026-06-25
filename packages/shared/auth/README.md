# @repo/auth

框架无关的权限判断核心。该包不读取用户 Store、不访问 Router，也不负责登录
跳转，只处理“当前权限是否满足要求”。

```txt
src/
  permissions/
    has-permission.ts
    has-permission.test.ts
    permission.types.ts
    index.ts
  index.ts
```

## 使用方式

```ts
import { hasPermission } from "@repo/auth";

const grantedPermissions = ["user:read", "order:read"];

hasPermission(grantedPermissions, ["user:read"]);
hasPermission(grantedPermissions, ["order:update", "order:read"], "any");
```

- 默认使用 `all`，要求全部权限都存在。
- `any` 要求至少存在一个权限。
- 空权限要求表示公开能力，返回 `true`。
- 权限码由业务域定义，推荐使用 `资源:动作`，例如 `user:read`。

React 和 Vue 应用应通过各自的框架适配包使用 Provider、Hook、Composable 和
Guard。
