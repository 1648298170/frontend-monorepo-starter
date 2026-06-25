import { computed, inject, toValue, type MaybeRefOrGetter } from "vue";

import {
  hasPermission,
  type PermissionCode,
  type PermissionMode,
} from "@repo/auth";

import { permissionContextKey } from "../context/permission-context";

// 读取 Provider 权限并返回响应式权限判断结果。
export function usePermission(
  requiredPermissions: MaybeRefOrGetter<readonly PermissionCode[]>,
  mode: MaybeRefOrGetter<PermissionMode> = "all"
) {
  const grantedPermissions = inject(permissionContextKey);

  // 显式报错比静默返回 false 更容易定位应用装配遗漏。
  if (!grantedPermissions) {
    throw new Error("usePermission must be used within PermissionProvider.");
  }

  // requiredPermissions、mode 或 Provider 权限变化时自动重新计算。
  return computed(() =>
    hasPermission(
      grantedPermissions.value,
      toValue(requiredPermissions),
      toValue(mode)
    )
  );
}
