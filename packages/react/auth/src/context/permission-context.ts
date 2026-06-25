import { createContext } from "react";

import type { PermissionCode } from "@repo/auth";

// undefined 用于识别调用方是否遗漏 PermissionProvider。
export const PermissionContext = createContext<
  ReadonlySet<PermissionCode> | undefined
>(undefined);
