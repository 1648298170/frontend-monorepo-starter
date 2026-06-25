// 扩展 Vitest 断言，例如 toBeInTheDocument。
import "@testing-library/jest-dom/vitest";

import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// 每个测试结束后卸载组件，避免 DOM 和事件监听相互污染。
afterEach(() => {
  cleanup();
});
