import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vitest/config";

// Vue 权限包需要 SFC 编译和轻量 DOM 环境来验证 Provider 与 Guard 行为。
export default defineConfig({
  plugins: [vue()],
  test: {
    environment: "happy-dom",
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.test.ts"],
  },
});
