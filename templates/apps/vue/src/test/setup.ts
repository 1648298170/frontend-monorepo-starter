// 扩展 Vitest 断言，例如 toBeInTheDocument。
import "@testing-library/jest-dom/vitest";

import { cleanup } from "@testing-library/vue";
import { afterEach } from "vitest";

// 每个测试结束后卸载 Vue 组件，防止 DOM 状态跨测试残留。
afterEach(() => {
  cleanup();
});
