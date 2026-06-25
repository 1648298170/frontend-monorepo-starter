import type { ReactNode } from "react";

import type { PermissionCode, PermissionMode } from "@repo/auth";

import { usePermission } from "../../hooks/usePermission";

export interface PermissionGuardProps {
  // 当前内容要求的权限码。
  permissions: readonly PermissionCode[];
  // all 要求全部满足，any 要求任意一个满足。
  mode?: PermissionMode;
  // 权限满足时渲染的内容。
  children: ReactNode;
  // 权限不足时的替代内容，默认不渲染。
  fallback?: ReactNode;
}

// 根据权限结果选择业务内容或 fallback，不负责路由跳转和登录流程。
export function PermissionGuard({
  permissions,
  mode = "all",
  children,
  fallback = null,
}: PermissionGuardProps) {
  const canAccess = usePermission(permissions, mode);

  return canAccess ? children : fallback;
}
