import { readonly } from "vue";

import { createAppConfig } from "@repo/config";
import { createRequestClient, HttpError } from "@repo/request";

import { errorReporter } from "../error-handling/error-reporter";

// 应用配置在启动时解析一次，并以只读形式供全部组件共享。
const config = readonly(createAppConfig(import.meta.env));

// 请求客户端在模块初始化时创建一次，避免每次调用 Composable 都重复装配。
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

// 服务对象本身不需要响应式代理，导出稳定的应用级单例即可。
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
