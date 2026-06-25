import { defineConfig } from "vitest/config";

// UI 包使用浏览器语义环境运行组件测试，并统一加载 jest-dom 断言。
export default defineConfig({
  test: {
    environment: "happy-dom",
    setupFiles: ["./src/test/setup.ts"],
  },
});
