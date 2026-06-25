import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { MetricCard } from "./MetricCard";

// 组件测试关注调用方可观察到的文案和状态，不依赖内部 DOM 层级。
describe("MetricCard", () => {
  it("renders its label, value and tone", () => {
    render(<MetricCard label="Conversion" value="42%" tone="success" />);

    expect(screen.getByText("Conversion")).toBeInTheDocument();
    expect(screen.getByText("42%").closest("article")).toHaveAttribute(
      "data-tone",
      "success"
    );
  });
});
