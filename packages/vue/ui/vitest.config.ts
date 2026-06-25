import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vitest/config";

// Vue 插件负责在 Vitest 中编译单文件组件，happy-dom 提供浏览器语义环境。
export default defineConfig({
  plugins: [vue()],
  test: {
    environment: "happy-dom",
    setupFiles: ["./src/test/setup.ts"],
  },
});
