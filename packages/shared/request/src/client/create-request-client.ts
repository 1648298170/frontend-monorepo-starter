import { HttpError, RequestTimeoutError } from "../errors";
import { readResponsePayload } from "../response/read-response-payload";
import type {
  RequestClient,
  RequestClientOptions,
  RequestContext,
  RequestOptions,
} from "./request-client.types";

// 创建一个框架无关的请求客户端，应用通过 options 注入鉴权、拦截和错误策略。
export function createRequestClient(
  options: RequestClientOptions = {}
): RequestClient {
  // 测试可注入模拟 fetch，生产环境默认使用浏览器提供的全局 fetch。
  const fetchImplementation = options.fetch ?? globalThis.fetch;

  // request 是公共调用入口，负责完成请求准备、发送、解析和错误归一化。
  async function request<T>(
    path: string,
    requestOptions: RequestOptions = {}
  ): Promise<T> {
    const { timeoutMs = options.timeoutMs ?? 30_000, ...requestInit } =
      requestOptions;
    const token = await options.getToken?.();
    const headers = new Headers(requestInit.headers);
    const timeoutController = new AbortController();
    const timeoutId = setTimeout(() => timeoutController.abort(), timeoutMs);

    // 调用方显式传入 Authorization 时优先，避免公共客户端覆盖特殊鉴权场景。
    if (token && !headers.has("Authorization")) {
      headers.set("Authorization", `Bearer ${token}`);
    }

    // context 是拦截器之间传递的完整请求上下文，可安全修改 URL 和请求参数。
    let context: RequestContext = {
      path,
      url: createRequestUrl(options.baseUrl, path),
      init: {
        ...requestInit,
        headers,
      },
    };

    try {
      // 请求拦截器适合注入租户、语言、Trace ID 等应用级信息。
      if (options.onRequest) {
        context = await options.onRequest(context);
      }

      // 将调用方取消信号与内部超时信号组合，任意一个触发都会中止 Fetch。
      context = {
        ...context,
        init: {
          ...context.init,
          signal: combineAbortSignals(
            context.init.signal,
            timeoutController.signal
          ),
        },
      };

      let response = await fetchImplementation(context.url, context.init);

      // 响应拦截器可读取或替换响应，但业务错误码策略仍由应用决定。
      if (options.onResponse) {
        response = await options.onResponse(response, context);
      }

      // 响应体统一解析一次，避免错误响应和成功响应使用两套读取逻辑。
      const payload = await readResponsePayload(response);

      // 非 2xx 响应转换为带状态码、响应体和 URL 的统一 HttpError。
      if (!response.ok) {
        throw new HttpError(
          response.statusText || "Request failed",
          response.status,
          payload,
          context.url
        );
      }

      return payload as T;
    } catch (error) {
      // 仅将内部超时转换为 RequestTimeoutError，调用方主动取消仍保留 AbortError。
      const normalizedError =
        timeoutController.signal.aborted && !requestInit.signal?.aborted
          ? new RequestTimeoutError(timeoutMs, context.url)
          : error;

      try {
        // 错误钩子用于监控或业务处理，其自身失败不能覆盖原始请求错误。
        await options.onError?.(normalizedError, context);
      } catch (errorHandlerError) {
        console.error("Request error handler failed", errorHandlerError);
      }

      throw normalizedError;
    } finally {
      // 无论请求成功或失败都清理定时器，避免长期运行页面积累无效任务。
      clearTimeout(timeoutId);
    }
  }

  return { request };
}

// 拼接 Base URL 时只处理边界斜杠；完整绝对地址保持原样。
function createRequestUrl(baseUrl = "", path: string) {
  if (!baseUrl || /^https?:\/\//.test(path)) {
    return path;
  }

  return `${baseUrl.replace(/\/$/, "")}/${path.replace(/^\//, "")}`;
}

// 同时支持业务主动取消和客户端超时取消。
function combineAbortSignals(
  requestSignal: AbortSignal | null | undefined,
  timeoutSignal: AbortSignal
) {
  if (!requestSignal) {
    return timeoutSignal;
  }

  return AbortSignal.any([requestSignal, timeoutSignal]);
}
