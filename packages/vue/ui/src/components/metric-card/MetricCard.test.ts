import { render, screen } from "@testing-library/vue";
import { describe, expect, it } from "vitest";

import MetricCard from "./MetricCard.vue";

// 组件测试关注调用方可观察到的文案和状态，不读取 Vue 组件内部实例。
describe("MetricCard", () => {
  it("renders its label, value and tone", () => {
    render(MetricCard, {
      props: {
        label: "Conversion",
        value: "42%",
        tone: "success",
      },
    });

    expect(screen.getByText("Conversion")).toBeInTheDocument();
    expect(screen.getByText("42%").closest("article")).toHaveAttribute(
      "data-tone",
      "success"
    );
  });
});
