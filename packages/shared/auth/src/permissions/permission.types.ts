// 权限码由业务域定义，例如 user:read、order:approve。
export type PermissionCode = string;

// all 表示全部满足，any 表示满足任意一个。
export type PermissionMode = "all" | "any";
