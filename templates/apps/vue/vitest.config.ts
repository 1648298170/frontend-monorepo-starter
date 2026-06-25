import { fileURLToPath, URL } from "node:url";

import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vitest/config";

// Vue 应用独立维护测试配置，以便正确编译 SFC 和运行 DOM 测试。
export default defineConfig({
  // 复用 Vite Vue 插件处理测试所引用的 .vue 文件。
  plugins: [vue()],
  resolve: {
    // 测试中的 @ 别名与应用构建配置保持一致。
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    // happy-dom 提供组件测试所需的轻量浏览器环境。
    environment: "happy-dom",
    // setup 统一安装 jest-dom 断言并在每个测试后清理挂载内容。
    setupFiles: ["./src/test/setup.ts"],
    // Vue 测试逻辑使用 TypeScript，必要时也允许 TSX 辅助组件。
    include: ["src/**/*.test.{ts,tsx}"],
    coverage: {
      // 使用 V8 原生覆盖率并覆盖 TypeScript 与 Vue 单文件组件。
      provider: "v8",
      // 同时输出终端、HTML 和 CI 常用的 LCOV 报告。
      reporter: ["text", "html", "lcov"],
      reportsDirectory: "./coverage",
      include: ["src/**/*.{ts,vue}"],
      exclude: [
        "src/**/*.d.ts",
        "src/main.ts",
        "src/test/**",
        "src/**/index.ts",
      ],
    },
  },
});
