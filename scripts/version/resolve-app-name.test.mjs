import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { resolveAppName } from "./resolve-app-name.mjs";

// 应用名解析测试同时保护根命令和应用内快捷命令的调用方式。
describe("resolveAppName", () => {
  const workspaceRoot = resolve("virtual-workspace");

  it("优先返回根命令显式传入的应用名", () => {
    expect(
      resolveAppName({
        workspaceRoot,
        cwd: workspaceRoot,
        explicitAppName: "admin-web",
      })
    ).toBe("admin-web");
  });

  it("从 apps 的直接子目录推断应用名", () => {
    expect(
      resolveAppName({
        workspaceRoot,
        cwd: resolve(workspaceRoot, "apps", "portal-web"),
      })
    ).toBe("portal-web");
  });

  it("无法安全推断时要求显式传入应用名", () => {
    expect(() =>
      resolveAppName({
        workspaceRoot,
        cwd: workspaceRoot,
      })
    ).toThrow("缺少参数 --app");
  });
});
