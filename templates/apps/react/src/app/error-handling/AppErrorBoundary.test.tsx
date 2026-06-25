import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// 使用提升后的 mock 函数替换真实控制台 reporter，测试只观察公共上报行为。
const { report } = vi.hoisted(() => ({
  report: vi.fn(),
}));

vi.mock("./error-reporter", () => ({
  errorReporter: { report },
}));

import { AppErrorBoundary } from "./AppErrorBoundary";

// 该组件模拟 React 渲染阶段异常，用于触发 Error Boundary。
function BrokenComponent(): never {
  throw new Error("render failed");
}

// 测试从用户视角验证恢复页，并确认异常被交给统一 reporter。
describe("AppErrorBoundary", () => {
  beforeEach(() => {
    report.mockClear();
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // 不读取 Boundary 内部 state，只验证用户可见结果和外部上报契约。
  it("renders a recovery screen and reports render errors", () => {
    render(
      <AppErrorBoundary>
        <BrokenComponent />
      </AppErrorBoundary>
    );

    expect(
      screen.getByRole("heading", { name: "页面暂时无法显示" })
    ).toBeInTheDocument();
    expect(report).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.any(Error),
        source: "react-render",
      })
    );
  });
});
