import { fileURLToPath, URL } from "node:url";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

// React 应用独立维护测试配置，以便使用 JSX 转换和 DOM 测试环境。
export default defineConfig({
  // 复用 Vite React 插件处理测试文件中的 TSX。
  plugins: [react()],
  resolve: {
    // 测试中的 @ 别名与应用构建配置保持一致。
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    // happy-dom 提供轻量浏览器 API，适合组件行为测试。
    environment: "happy-dom",
    // setup 统一安装 jest-dom 断言并在每个测试后清理 DOM。
    setupFiles: ["./src/test/setup.ts"],
    // 应用测试只扫描源码目录下的 TypeScript/TSX 测试文件。
    include: ["src/**/*.test.{ts,tsx}"],
    coverage: {
      // 使用 V8 原生覆盖率，降低额外转译成本。
      provider: "v8",
      // 终端用于即时查看，HTML/LCOV 供本地报告和后续 CI 使用。
      reporter: ["text", "html", "lcov"],
      reportsDirectory: "./coverage",
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "src/**/*.d.ts",
        "src/main.tsx",
        "src/test/**",
        "src/**/index.ts",
      ],
    },
  },
});
