import { render, screen, within } from "@testing-library/vue";
import { describe, expect, it, vi } from "vitest";

// 将运行时配置 Composable 替换为稳定测试数据，避免依赖真实环境变量。
vi.mock("@/composables/useRuntimeConfig", () => ({
  useRuntimeConfig: () => ({
    config: {
      appName: "Vue Test Application",
    },
  }),
}));

import TemplateOverview from "./TemplateOverview.vue";

// 组件级测试从用户视角验证可见内容，不访问 computed 或组件实例内部状态。
describe("TemplateOverview", () => {
  it("renders application identity and template capabilities", () => {
    render(TemplateOverview);

    // 环境配置中的应用名称应展示在组件头部。
    expect(screen.getByText("Vue Test Application")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Vue business app template",
      })
    ).toBeInTheDocument();

    // 在带语义标签的能力区域内验证用户真正能看到的指标卡内容。
    const capabilities = screen.getByRole("region", {
      name: "Template capabilities",
    });

    expect(within(capabilities).getAllByRole("article")).toHaveLength(3);
    expect(within(capabilities).getByText("Vue 3")).toBeInTheDocument();
    expect(within(capabilities).getByText("Shared API")).toBeInTheDocument();
    expect(within(capabilities).getByText("96.0%")).toBeInTheDocument();
  });
});
