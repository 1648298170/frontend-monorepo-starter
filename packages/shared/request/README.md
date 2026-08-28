# @repo/request

框架无关的 Fetch 请求模块。

```txt
src/
  client/
    create-request-client.ts
    create-request-client.test.ts
    request-client.types.ts
    index.ts
  errors/
    http-error.ts
    index.ts
  response/
    read-response-payload.ts
  index.ts
```

- `client` 是主要 public interface，负责创建请求客户端。
- `errors` 暴露调用方需要识别的错误类型。
- `response` 是内部实现细节，不通过 `package.json` 暴露。
- 客户端统一处理 Base URL、Token、超时、取消、响应解析和 HTTP 错误。
- `onRequest`、`onResponse`、`onError` 是应用注入业务策略的扩展点。
- Token 刷新、登出、业务错误码和页面提示属于应用，不写死在公共包。

```ts
import {
  createRequestClient,
  HttpError,
  RequestTimeoutError,
} from "@repo/request";
import type { RequestClientOptions } from "@repo/request/client";

const client = createRequestClient({
  baseUrl: "/api",
  timeoutMs: 10_000,
  getToken: () => sessionStorage.getItem("access-token") ?? undefined,
  onRequest: (context) => {
    const headers = new Headers(context.init.headers);
    headers.set("X-Application", "admin-web");

    return {
      ...context,
      init: { ...context.init, headers },
    };
  },
  onError: (error, context) => {
    // 在应用层接入日志平台、登录失效处理或用户提示。
    console.error(context.url, error);
  },
});
```

调用方可以通过标准 `AbortController` 主动取消请求：

```ts
const controller = new AbortController();
const request = client.request("/users", {
  signal: controller.signal,
});

controller.abort();
await request;
```

## 查询参数

`params` 会在请求发出前自动序列化并拼接到 URL，`null` 和 `undefined`
会被跳过，路径自带查询串时使用 `&` 追加：

```ts
const users = await client.request<{ id: number }[]>("/users", {
  params: { page: 1, size: 20, keyword: "hello world" },
});
// GET /users?page=1&size=20&keyword=hello+world
```

## 对象请求体

非原生 `BodyInit` 的对象（普通对象、数组等）会自动 `JSON.stringify`，并在调用方
未设置 `content-type` 时补齐 `application/json`；显式设置的 `content-type` 优先，
字符串、FormData、URLSearchParams、Blob、ReadableStream 等原生请求体保持原样：

```ts
await client.request("/users", {
  method: "POST",
  body: { name: "Alice" },
});
```

## 响应类型

`responseType` 指定响应体读取方式，支持 `json`、`text`、`blob` 和
`arrayBuffer`，缺省时按 `Content-Type` 自动判断。204/205 按 HTTP
语义没有响应体，无论 `responseType` 是什么都返回 `undefined`：

```ts
// 下载二进制文件时避免经过文本转换。
const blob = await client.request<Blob>("/files/report.pdf", {
  responseType: "blob",
});
```

错误响应始终按 auto 模式解析，`HttpError.payload` 不会因为
`responseType: "blob"` 或 `"arrayBuffer"` 变成不可读的二进制对象。

超时会抛出 `RequestTimeoutError`，非 2xx 响应会抛出带有 `status`、
`payload` 和 `url` 的 `HttpError`。调用方主动取消时保留原始
`AbortError`，便于区分超时和用户取消。
