import { expect, test } from "@playwright/test";

// 生成应用默认携带首页冒烟用例，验证启动、路由和首屏渲染链路。
test("React 应用可以打开首页", async ({ page }) => {
  // 使用应用 Playwright 配置中的 baseURL 访问首页。
  await page.goto("/");

  // 通过用户可见标题验证应用已成功渲染。
  await expect(
    page.getByRole("heading", { name: "React business app template" })
  ).toBeVisible();
});
