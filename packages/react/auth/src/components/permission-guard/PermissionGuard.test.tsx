import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PermissionProvider } from "../permission-provider";
import { PermissionGuard } from "./PermissionGuard";

// 组件测试从用户视角验证允许内容和拒绝内容，不读取 Context 内部值。
describe("PermissionGuard", () => {
  it("renders protected content when permissions are satisfied", () => {
    render(
      <PermissionProvider permissions={["user:read", "user:update"]}>
        <PermissionGuard permissions={["user:read"]}>
          <button type="button">Edit user</button>
        </PermissionGuard>
      </PermissionProvider>
    );

    expect(
      screen.getByRole("button", { name: "Edit user" })
    ).toBeInTheDocument();
  });

  it("renders fallback when permissions are missing", () => {
    render(
      <PermissionProvider permissions={["user:read"]}>
        <PermissionGuard
          permissions={["user:delete"]}
          fallback={<p>Access denied</p>}
        >
          <button type="button">Delete user</button>
        </PermissionGuard>
      </PermissionProvider>
    );

    expect(screen.getByText("Access denied")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Delete user" })
    ).not.toBeInTheDocument();
  });
});
