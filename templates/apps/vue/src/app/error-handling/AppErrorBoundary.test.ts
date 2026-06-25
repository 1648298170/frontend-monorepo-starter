import { render, screen } from "@testing-library/vue";
import { defineComponent } from "vue";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// 使用提升后的 mock 函数替换真实控制台 reporter，避免测试输出噪声。
const { report } = vi.hoisted(() => ({
  report: vi.fn(),
}));

vi.mock("./error-reporter", () => ({
  errorReporter: { report },
}));

import AppErrorBoundary from "./AppErrorBoundary.vue";

// setup 阶段主动抛错，模拟子组件初始化失败。
const BrokenComponent = defineComponent({
  setup() {
    throw new Error("render failed");
  },
  template: "<div />",
});

// 测试从用户视角验证恢复页，并确认异常被交给统一 reporter。
describe("AppErrorBoundary", () => {
  beforeEach(() => {
    report.mockClear();
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // 不访问组件内部 ref，只断言可见界面和上报调用。
  it("renders a recovery screen and reports render errors", async () => {
    render(AppErrorBoundary, {
      slots: {
        default: BrokenComponent,
      },
    });

    expect(
      await screen.findByRole("heading", { name: "页面暂时无法显示" })
    ).toBeInTheDocument();
    expect(report).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.any(Error),
        source: "vue-render",
      })
    );
  });
});
