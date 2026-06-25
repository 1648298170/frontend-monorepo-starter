import { render, screen } from "@testing-library/vue";
import { defineComponent, h } from "vue";
import { describe, expect, it } from "vitest";

import PermissionProvider from "../permission-provider/PermissionProvider.vue";
import PermissionGuard from "./PermissionGuard.vue";

// 通过测试宿主组合 Provider 和 Guard，测试只观察最终用户可见内容。
function createTestHost(
  grantedPermissions: readonly string[],
  requiredPermissions: readonly string[]
) {
  return defineComponent({
    setup() {
      return () =>
        h(
          PermissionProvider,
          { permissions: grantedPermissions },
          {
            default: () =>
              h(
                PermissionGuard,
                { permissions: requiredPermissions },
                {
                  default: () => h("button", { type: "button" }, "Edit user"),
                  fallback: () => h("p", "Access denied"),
                }
              ),
          }
        );
    },
  });
}

// 组件测试验证默认插槽和 fallback 插槽，不读取 provide/inject 内部值。
describe("PermissionGuard", () => {
  it("renders protected content when permissions are satisfied", () => {
    render(createTestHost(["user:read", "user:update"], ["user:update"]));

    expect(
      screen.getByRole("button", { name: "Edit user" })
    ).toBeInTheDocument();
  });

  it("renders fallback when permissions are missing", () => {
    render(createTestHost(["user:read"], ["user:update"]));

    expect(screen.getByText("Access denied")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Edit user" })
    ).not.toBeInTheDocument();
  });
});
