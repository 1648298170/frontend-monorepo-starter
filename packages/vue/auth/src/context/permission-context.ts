import type { ComputedRef, InjectionKey } from "vue";

import type { PermissionCode } from "@repo/auth";

// 使用 Symbol 类型键避免大型应用中出现 provide/inject 名称冲突。
export const permissionContextKey: InjectionKey<
  ComputedRef<ReadonlySet<PermissionCode>>
> = Symbol("permission-context");
