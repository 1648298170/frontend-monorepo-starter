// 请求上下文会在请求、响应和错误扩展点之间传递。
export interface RequestContext {
  path: string;
  url: string;
  init: RequestInit;
}

// 请求拦截器可以同步或异步修改请求上下文。
export type RequestInterceptor = (
  context: RequestContext
) => RequestContext | Promise<RequestContext>;

// 响应拦截器可用于响应转换、日志记录或特殊协议适配。
export type ResponseInterceptor = (
  response: Response,
  context: RequestContext
) => Response | Promise<Response>;

// 错误处理器只处理副作用，最终错误仍由 request 抛给调用方。
export type RequestErrorHandler = (
  error: unknown,
  context: RequestContext
) => void | Promise<void>;

// 客户端级配置会被所有请求共享。
export interface RequestClientOptions {
  baseUrl?: string;
  timeoutMs?: number;
  getToken?: () => string | undefined | Promise<string | undefined>;
  fetch?: typeof fetch;
  onRequest?: RequestInterceptor;
  onResponse?: ResponseInterceptor;
  onError?: RequestErrorHandler;
}

// 单次请求沿用原生 RequestInit，并允许覆盖默认超时时间。
export interface RequestOptions extends RequestInit {
  timeoutMs?: number;
}

// 公共客户端只暴露泛型 request，避免把具体业务接口耦合进基础包。
export interface RequestClient {
  request<T>(path: string, init?: RequestOptions): Promise<T>;
}
