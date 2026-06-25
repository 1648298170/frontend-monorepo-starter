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

超时会抛出 `RequestTimeoutError`，非 2xx 响应会抛出带有 `status`、
`payload` 和 `url` 的 `HttpError`。调用方主动取消时保留原始
`AbortError`，便于区分超时和用户取消。
