import { expect, test } from "@playwright/test";

// 冒烟用例只验证用户可观察到的首页能力，不依赖 Vue 组件内部实现。
test("Vue 应用可以打开首页并展示模板能力", async ({ page }) => {
  // 使用配置中的 baseURL 访问应用首页。
  await page.goto("/");

  // 标题验证路由、应用挂载和首屏渲染均已完成。
  await expect(
    page.getByRole("heading", { name: "Vue business app template" })
  ).toBeVisible();
  // 能力区域验证共享 UI 与 Design Token 样式入口已正常加载。
  await expect(
    page.getByRole("region", { name: "Template capabilities" })
  ).toBeVisible();
});
