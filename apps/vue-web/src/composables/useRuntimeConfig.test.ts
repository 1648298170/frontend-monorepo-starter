import { describe, expect, it } from "vitest";

import { useRuntimeConfig } from "./useRuntimeConfig";

// 回归测试确保不同组件调用 Composable 时共享同一份应用级服务。
describe("useRuntimeConfig", () => {
  it("returns the same runtime service instances across consumers", () => {
    const firstConsumer = useRuntimeConfig();
    const secondConsumer = useRuntimeConfig();

    expect(firstConsumer).toBe(secondConsumer);
    expect(firstConsumer.requestClient).toBe(secondConsumer.requestClient);
  });
});
