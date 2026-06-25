import { fileURLToPath, URL } from "node:url";

import {
  createLocalPlaywrightURL,
  createPlaywrightConfig,
} from "@repo/playwright-config";
import { loadEnv } from "vite";

// 读取应用公共环境变量，使 E2E 服务地址与 Vite 开发端口保持同一来源。
const env = loadEnv(
  "development",
  fileURLToPath(new URL(".", import.meta.url)),
  ""
);
// 显式传入 E2E_BASE_URL 时测试已部署环境，否则访问 Playwright 自动启动的本地 Vite。
const baseURL =
  process.env.E2E_BASE_URL ?? createLocalPlaywrightURL(env.DEV_SERVER_PORT);

// Vue 应用只声明自身差异，浏览器和报告策略由共享模块维护。
export default createPlaywrightConfig({
  appName: "vue-web",
  baseURL,
  reportRoot: fileURLToPath(
    new URL("../../reports/playwright/vue-web", import.meta.url)
  ),
  // 远端环境已经存在服务，不应再启动本地 Vite。
  webServerCommand: process.env.E2E_BASE_URL ? false : "pnpm dev",
});
