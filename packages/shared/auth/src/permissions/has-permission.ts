import type { PermissionCode, PermissionMode } from "./permission.types";

// 判断当前权限集合是否满足目标权限要求，不依赖任何框架或状态库。
export function hasPermission(
  grantedPermissions: Iterable<PermissionCode>,
  requiredPermissions: readonly PermissionCode[],
  mode: PermissionMode = "all"
) {
  // 没有声明权限要求等同于公开能力，Provider 和 Guard 可安全复用该语义。
  if (requiredPermissions.length === 0) {
    return true;
  }

  // Provider 传入 Set 时直接复用；普通数组调用仍会在此转换一次。
  const grantedPermissionSet =
    grantedPermissions instanceof Set
      ? grantedPermissions
      : new Set(grantedPermissions);

  if (mode === "any") {
    return requiredPermissions.some((permission) =>
      grantedPermissionSet.has(permission)
    );
  }

  return requiredPermissions.every((permission) =>
    grantedPermissionSet.has(permission)
  );
}
