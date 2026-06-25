import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { useRuntimeConfig } from "./useRuntimeConfig";

// 回归测试确保不同组件调用 Hook 时共享同一份应用级服务。
describe("useRuntimeConfig", () => {
  it("returns the same runtime service instances across consumers", () => {
    const firstConsumer = renderHook(() => useRuntimeConfig());
    const secondConsumer = renderHook(() => useRuntimeConfig());

    expect(firstConsumer.result.current).toBe(secondConsumer.result.current);
    expect(firstConsumer.result.current.requestClient).toBe(
      secondConsumer.result.current.requestClient
    );
  });
});
