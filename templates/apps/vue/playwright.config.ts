import { fileURLToPath, URL } from "node:url";

import {
  createLocalPlaywrightURL,
  createPlaywrightConfig,
} from "@repo/playwright-config";
import { loadEnv } from "vite";

// 读取应用公共环境变量，使生成应用的 E2E 地址自动跟随开发端口。
const env = loadEnv(
  "development",
  fileURLToPath(new URL(".", import.meta.url)),
  ""
);
// 显式传入 E2E_BASE_URL 时测试已部署环境，否则访问 Playwright 自动启动的本地 Vite。
const baseURL =
  process.env.E2E_BASE_URL ?? createLocalPlaywrightURL(env.DEV_SERVER_PORT);

// 生成应用只声明自身信息，共享配置负责浏览器、重试和报告策略。
export default createPlaywrightConfig({
  appName: "{{APP_NAME}}",
  baseURL,
  reportRoot: fileURLToPath(
    new URL("../../reports/playwright/{{APP_NAME}}", import.meta.url)
  ),
  // 远端环境已经存在服务，不应再启动本地 Vite。
  webServerCommand: process.env.E2E_BASE_URL ? false : "pnpm dev",
});
