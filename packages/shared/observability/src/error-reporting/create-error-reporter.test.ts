import { describe, expect, it, vi } from "vitest";

import { createErrorReporter } from "./create-error-reporter";

// 错误上报测试保护标准化、广播以及适配器故障隔离能力。
describe("createErrorReporter", () => {
  // 同一份标准报告需要分发给所有已注册的平台适配器。
  it("normalizes and dispatches one report to every adapter", () => {
    const firstReporter = vi.fn();
    const secondReporter = vi.fn();
    const reporter = createErrorReporter([firstReporter, secondReporter]);

    reporter.report({
      error: "render failed",
      source: "react",
      context: { route: "/" },
    });

    expect(firstReporter).toHaveBeenCalledOnce();
    expect(secondReporter).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.any(Error),
        source: "react",
        context: { route: "/" },
        timestamp: expect.any(String),
      })
    );
  });

  // 单个平台 SDK 发生异常时，其他平台仍应正常收到报告。
  it("does not let a broken adapter block the remaining adapters", () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const workingReporter = vi.fn();
    const reporter = createErrorReporter([
      () => {
        throw new Error("adapter failed");
      },
      workingReporter,
    ]);

    reporter.report({ error: new Error("app failed"), source: "vue" });

    expect(workingReporter).toHaveBeenCalledOnce();
    expect(consoleError).toHaveBeenCalledOnce();
    consoleError.mockRestore();
  });
});
