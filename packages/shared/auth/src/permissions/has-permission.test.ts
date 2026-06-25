import { describe, expect, it } from "vitest";

import { hasPermission } from "./has-permission";

// 权限核心测试只验证纯规则，不引入 React、Vue、Router 或 Store。
describe("hasPermission", () => {
  it("allows access when all required permissions are granted", () => {
    expect(
      hasPermission(["user:read", "user:update"], ["user:read", "user:update"])
    ).toBe(true);
  });

  it("denies access when all mode is missing one permission", () => {
    expect(hasPermission(["user:read"], ["user:read", "user:update"])).toBe(
      false
    );
  });

  it("allows access when any mode matches one permission", () => {
    expect(
      hasPermission(["order:read"], ["order:approve", "order:read"], "any")
    ).toBe(true);
  });

  it("allows access when no permission is required", () => {
    expect(hasPermission([], [])).toBe(true);
  });

  it("reuses a provided Set without iterating to create another Set", () => {
    const permissionSet = new Set(["user:read"]);

    // 如果实现尝试 new Set(permissionSet)，该迭代器会让测试失败。
    Object.defineProperty(permissionSet, Symbol.iterator, {
      value() {
        throw new Error("Permission Set should be reused.");
      },
    });

    expect(hasPermission(permissionSet, ["user:read"])).toBe(true);
  });
});
