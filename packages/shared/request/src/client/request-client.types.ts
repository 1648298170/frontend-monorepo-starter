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

// 查询参数支持标量值；null 和 undefined 会被跳过。
export type RequestQueryValue = string | number | boolean;

// 查询参数对象会在请求发出前序列化并追加到 URL。
export type RequestQueryParams = Record<
  string,
  RequestQueryValue | null | undefined
>;

// 响应读取模式：默认 auto 按 Content-Type 判断。
export type ResponseBodyType = "json" | "text" | "blob" | "arrayBuffer";

// 请求体在原生 BodyInit 之外额外接受普通对象和数组等，由客户端自动序列化为 JSON。
export type RequestBody = BodyInit | Record<string, unknown>;

// 单次请求沿用原生 RequestInit，并允许覆盖默认超时时间。
// body 需要放宽为接受非原生 BodyInit 的对象，因此这里用 Omit 后重新声明 body。
export interface RequestOptions extends Omit<RequestInit, "body"> {
  timeoutMs?: number;
  // 查询参数会在请求拦截器执行前拼接进最终 URL。
  params?: RequestQueryParams;
  // 指定响应体读取方式，缺省时按 Content-Type 自动判断。
  responseType?: ResponseBodyType;
  // 非原生 BodyInit 的对象请求体会被自动序列化为 JSON 字符串并补齐 content-type。
  body?: RequestBody | null;
}

// 公共客户端只暴露泛型 request，避免把具体业务接口耦合进基础包。
export interface RequestClient {
  request<T>(path: string, init?: RequestOptions): Promise<T>;
}
