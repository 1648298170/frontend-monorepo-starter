import { useMemo, type ReactNode } from "react";

import type { PermissionCode } from "@repo/auth";

import { PermissionContext } from "../../context/permission-context";

export interface PermissionProviderProps {
  // 当前登录主体拥有的完整权限集合。
  permissions: readonly PermissionCode[];
  // Provider 保护的应用或局部组件树。
  children: ReactNode;
}

// 将应用 Store 提供的权限注入 React 组件树，不直接依赖具体状态库。
export function PermissionProvider({
  permissions,
  children,
}: PermissionProviderProps) {
  // 权限数组引用变化时才创建 Set，所有 Guard 复用同一份快速查询结构。
  const permissionSet = useMemo(() => new Set(permissions), [permissions]);

  return (
    <PermissionContext value={permissionSet}>{children}</PermissionContext>
  );
}
