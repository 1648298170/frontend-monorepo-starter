# @repo/vue-auth

Vue 权限适配包，基于 `@repo/auth` 提供 Provider、Composable 和视图 Guard。

```txt
src/
  components/
    permission-provider/
    permission-guard/
  composables/
  context/
  test/
  index.ts
```

## 应用接入

应用负责从 Pinia、接口或登录会话取得权限，再注入 Provider：

```vue
<script setup lang="ts">
import { PermissionProvider } from "@repo/vue-auth";
</script>

<template>
  <PermissionProvider :permissions="currentUser.permissions">
    <RouterView />
  </PermissionProvider>
</template>
```

组件可以使用 Guard：

```vue
<PermissionGuard :permissions="['user:update']">
  <button type="button">编辑用户</button>

  <template #fallback>
    <span>无编辑权限</span>
  </template>
</PermissionGuard>
```

逻辑代码可以使用 Composable：

```ts
const canApprove = usePermission(["order:approve", "order:admin"], "any");
```

该包只控制前端展示和交互，不能替代服务端鉴权。
