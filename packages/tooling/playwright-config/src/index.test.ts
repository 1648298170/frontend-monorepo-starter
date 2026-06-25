import { describe, expect, it } from "vitest";

import { createLocalPlaywrightURL, createPlaywrightConfig } from "./index";

// 共享配置测试保护应用依赖的稳定接口，避免新增浏览器策略时破坏本地或远端运行方式。
describe("Playwright shared config", () => {
  it("creates a validated local URL from the application port", () => {
    expect(createLocalPlaywrightURL("5173")).toBe("http://127.0.0.1:5173");
    expect(() => createLocalPlaywrightURL("70000")).toThrow("不是有效端口");
  });

  it("can disable the local web server for a deployed environment", () => {
    const config = createPlaywrightConfig({
      appName: "admin-web",
      baseURL: "https://test.example.com",
      reportRoot: "reports/playwright/admin-web",
      webServerCommand: false,
    });

    expect(config.webServer).toBeUndefined();
    expect(config.use?.baseURL).toBe("https://test.example.com");
    expect(config.projects?.map(({ name }) => name)).toEqual([
      "chromium",
      "firefox",
      "webkit",
    ]);
  });
});
