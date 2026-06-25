// 扩展 Vitest DOM 断言，例如 toBeInTheDocument。
import "@testing-library/jest-dom/vitest";

import { cleanup } from "@testing-library/vue";
import { afterEach } from "vitest";

// 每个测试后卸载 Vue 组件树，避免 provide/inject 上下文跨用例残留。
afterEach(() => {
  cleanup();
});
