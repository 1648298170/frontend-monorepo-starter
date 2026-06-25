import { createAppConfig } from "@repo/config";
import { createRequestClient, HttpError } from "@repo/request";

import { errorReporter } from "../error-handling/error-reporter";

// 应用配置在启动时解析一次，后续组件共享同一个不可变配置对象。
const config = createAppConfig(import.meta.env);

// 请求客户端在模块初始化时创建一次，统一复用 Base URL、拦截器和错误策略。
const requestClient = createRequestClient({
  baseUrl: config.apiBaseUrl,
  onError: (error, context) => {
    if (isExpectedRequestError(error)) {
      return;
    }

    errorReporter.report({
      error,
      source: "http-request",
      context: { url: context.url },
    });
  },
});

// 导出应用级服务单例，Hook 只负责提供稳定的消费入口。
export const runtimeServices = Object.freeze({
  config,
  requestClient,
});

// 用户取消与可预期客户端错误不进入全局监控，减少无效告警。
function isExpectedRequestError(error: unknown) {
  return (
    (error instanceof DOMException && error.name === "AbortError") ||
    (error instanceof HttpError && error.status < 500)
  );
}
