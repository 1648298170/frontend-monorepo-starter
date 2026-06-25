// 扩展 Vitest DOM 断言，例如 toBeInTheDocument。
import "@testing-library/jest-dom/vitest";

import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// 每个测试后清理 React 组件树，避免 Provider 上下文跨用例残留。
afterEach(() => {
  cleanup();
});
