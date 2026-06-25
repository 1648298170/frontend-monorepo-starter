import { consoleErrorReporter, createErrorReporter } from "@repo/observability";

// React 应用唯一的错误上报实例，后续监控平台统一在此处接入。
export const errorReporter = createErrorReporter([
  consoleErrorReporter,
  // 在这里追加 Sentry 等平台适配器，组件和路由无需感知具体平台。
]);
