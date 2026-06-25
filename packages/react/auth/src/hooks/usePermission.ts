import { use } from "react";

import {
  hasPermission,
  type PermissionCode,
  type PermissionMode,
} from "@repo/auth";

import { PermissionContext } from "../context/permission-context";

// 读取 Provider 权限并返回当前权限要求是否满足。
export function usePermission(
  requiredPermissions: readonly PermissionCode[],
  mode: PermissionMode = "all"
) {
  const grantedPermissions = use(PermissionContext);

  // 显式报错比静默返回 false 更容易定位应用装配遗漏。
  if (!grantedPermissions) {
    throw new Error("usePermission must be used within PermissionProvider.");
  }

  return hasPermission(grantedPermissions, requiredPermissions, mode);
}
