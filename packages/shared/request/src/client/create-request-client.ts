import { HttpError, RequestTimeoutError } from "../errors";
import { readResponsePayload } from "../response/read-response-payload";
import type {
  RequestClient,
  RequestClientOptions,
  RequestContext,
  RequestOptions,
  RequestQueryParams,
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
    // params 和 responseType 是客户端扩展选项，展开前必须取出，避免泄漏进 Fetch init。
    const {
      timeoutMs = options.timeoutMs ?? 30_000,
      params,
      responseType,
      ...requestInit
    } = requestOptions;
    const token = await options.getToken?.();
    const headers = new Headers(requestInit.headers);
    const timeoutController = new AbortController();
    const timeoutId = setTimeout(() => timeoutController.abort(), timeoutMs);

    // 调用方显式传入 Authorization 时优先，避免公共客户端覆盖特殊鉴权场景。
    if (token && !headers.has("Authorization")) {
      headers.set("Authorization", `Bearer ${token}`);
    }

    // 对象请求体（非原生 BodyInit）先于拦截器完成序列化，保证 onRequest 看到的 init 与实际发送一致。
    const serializedBody = serializeJsonBody(requestInit.body, headers);

    // context 是拦截器之间传递的完整请求上下文，可安全修改 URL 和请求参数。
    let context: RequestContext = {
      path,
      // 查询参数在拦截器执行前拼接完成，拦截器看到的就是最终 URL。
      url: appendQueryParams(createRequestUrl(options.baseUrl, path), params),
      init: {
        ...requestInit,
        body: serializedBody,
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

      // 先判断状态再读取响应体：错误响应始终用 auto 模式解析，保证 HttpError.payload 可读。
      if (!response.ok) {
        const payload = await readResponsePayload(response);

        // 非 2xx 响应转换为带状态码、响应体和 URL 的统一 HttpError。
        throw new HttpError(
          response.statusText || "Request failed",
          response.status,
          payload,
          context.url
        );
      }

      // 成功响应按调用方声明的 responseType 读取，缺省时按 Content-Type 自动判断。
      return (await readResponsePayload(response, responseType)) as T;
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

// 将查询参数序列化并追加到 URL：已有问号时用 & 连接，null/undefined 直接跳过。
function appendQueryParams(url: string, params?: RequestQueryParams) {
  if (!params) {
    return url;
  }

  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    // null/undefined 不写入查询串，数字和布尔值统一转换为字符串。
    if (value === null || value === undefined) {
      continue;
    }

    searchParams.append(key, String(value));
  }

  const query = searchParams.toString();
  if (!query) {
    return url;
  }

  return url.includes("?") ? `${url}&${query}` : `${url}?${query}`;
}

// 判断请求体是否为需要自动 JSON 序列化的对象（普通对象、数组等非原生 BodyInit 的对象）。
// FormData、URLSearchParams、Blob、ReadableStream、ArrayBuffer、TypedArray、DataView 和字符串保持原样。
function isPlainObjectBody(
  body: RequestOptions["body"]
): body is Record<string, unknown> {
  return (
    typeof body === "object" &&
    body !== null &&
    !(body instanceof FormData) &&
    !(body instanceof URLSearchParams) &&
    !(body instanceof Blob) &&
    !(body instanceof ReadableStream) &&
    !(body instanceof ArrayBuffer) &&
    !ArrayBuffer.isView(body)
  );
}

// 非原生 BodyInit 的对象请求体自动序列化为 JSON 字符串，并在调用方未设置 content-type 时补齐。
function serializeJsonBody(
  body: RequestOptions["body"],
  headers: Headers
): RequestInit["body"] {
  if (!isPlainObjectBody(body)) {
    return body;
  }

  // 调用方显式设置的 content-type 优先，不做覆盖。
  if (!headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }

  return JSON.stringify(body);
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
