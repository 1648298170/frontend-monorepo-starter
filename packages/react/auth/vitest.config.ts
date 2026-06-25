import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

// React 权限包需要 JSX 转换和轻量 DOM 环境来验证 Provider 与 Guard 行为。
export default defineConfig({
  plugins: [react()],
  test: {
    environment: "happy-dom",
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
  },
});
