import { afterEach, describe, expect, it, vi } from "vitest";

import { RequestTimeoutError } from "../errors";
import { createRequestClient } from "./create-request-client";

// 请求客户端测试重点保护 URL、鉴权、异常类型、超时和取消等公共契约。
describe("createRequestClient", () => {
  // 避免单个假时钟测试影响后续测试环境。
  afterEach(() => {
    vi.useRealTimers();
  });

  // 验证客户端级配置和请求拦截器能够共同作用于最终 Fetch 参数。
  it("combines base URL, token and request interceptor", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ id: 1 }), {
        headers: { "content-type": "application/json" },
      })
    );
    const client = createRequestClient({
      baseUrl: "https://api.example.com/",
      fetch: fetchMock,
      getToken: async () => "access-token",
      onRequest: (context) => {
        const headers = new Headers(context.init.headers);
        headers.set("X-Application", "react-web");

        return {
          ...context,
          init: { ...context.init, headers },
        };
      },
    });

    await expect(client.request<{ id: number }>("/users")).resolves.toEqual({
      id: 1,
    });

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0]!;
    const headers = new Headers(init?.headers);

    expect(url).toBe("https://api.example.com/users");
    expect(headers.get("Authorization")).toBe("Bearer access-token");
    expect(headers.get("X-Application")).toBe("react-web");
  });

  // 调用方显式鉴权通常用于临时 Token 或第三方接口，不能被默认 Token 覆盖。
  it("preserves an explicitly provided authorization header", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(null, { status: 204 }));
    const client = createRequestClient({
      fetch: fetchMock,
      getToken: () => "default-token",
    });

    await expect(
      client.request("/users", {
        headers: { Authorization: "Custom token" },
      })
    ).resolves.toBeUndefined();

    const headers = new Headers(fetchMock.mock.calls[0]?.[1]?.headers);
    expect(headers.get("Authorization")).toBe("Custom token");
  });

  // 非成功响应必须保留状态码、响应数据和请求地址，供业务层准确判断。
  it("throws an HttpError with response details", async () => {
    const onError = vi.fn();
    const client = createRequestClient({
      fetch: vi.fn<typeof fetch>().mockResolvedValue(
        new Response(JSON.stringify({ code: "USER_NOT_FOUND" }), {
          status: 404,
          statusText: "Not Found",
          headers: { "content-type": "application/json" },
        })
      ),
      onError,
    });

    const request = client.request("/users/1");

    await expect(request).rejects.toMatchObject({
      name: "HttpError",
      status: 404,
      payload: { code: "USER_NOT_FOUND" },
      url: "/users/1",
    });
    expect(onError).toHaveBeenCalledOnce();
  });

  // 监控或错误回调故障时，调用方仍应收到最初的网络错误。
  it("preserves the request error when the error handler fails", async () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const client = createRequestClient({
      fetch: vi
        .fn<typeof fetch>()
        .mockRejectedValue(new TypeError("Network failed")),
      onError: () => {
        throw new Error("Reporter failed");
      },
    });

    await expect(client.request("/users")).rejects.toThrow("Network failed");
    expect(consoleError).toHaveBeenCalledWith(
      "Request error handler failed",
      expect.any(Error)
    );
    consoleError.mockRestore();
  });

  // 内部定时器触发的取消应转换为更明确的超时错误。
  it("converts an internal timeout abort into RequestTimeoutError", async () => {
    vi.useFakeTimers();
    const client = createRequestClient({
      timeoutMs: 100,
      fetch: vi.fn<typeof fetch>((_input, init) => {
        return new Promise((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => {
            reject(new DOMException("Aborted", "AbortError"));
          });
        });
      }),
    });

    const request = client.request("/slow");
    const assertion =
      expect(request).rejects.toBeInstanceOf(RequestTimeoutError);
    await vi.advanceTimersByTimeAsync(100);

    await assertion;
  });

  // 用户主动取消应保持原生 AbortError，避免被误认为服务超时。
  it("preserves an abort initiated by the caller", async () => {
    const controller = new AbortController();
    const client = createRequestClient({
      fetch: vi.fn<typeof fetch>((_input, init) => {
        return new Promise((_resolve, reject) => {
          if (init?.signal?.aborted) {
            reject(new DOMException("Aborted", "AbortError"));
            return;
          }

          init?.signal?.addEventListener("abort", () => {
            reject(new DOMException("Aborted", "AbortError"));
          });
        });
      }),
    });

    const request = client.request("/cancelled", {
      signal: controller.signal,
    });
    controller.abort();

    await expect(request).rejects.toMatchObject({ name: "AbortError" });
  });

  // 查询参数自动序列化并拼接到 URL，特殊字符按 URLSearchParams 规则编码。
  it("appends serialized query params to the request URL", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(null, { status: 204 }));
    const client = createRequestClient({
      baseUrl: "https://api.example.com/",
      fetch: fetchMock,
    });

    await client.request("/users", {
      params: { page: 1, active: true, keyword: "hello world" },
    });

    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      "https://api.example.com/users?page=1&active=true&keyword=hello+world"
    );
  });

  // 路径自带查询串时，参数应使用 & 追加而不是重复问号。
  it("appends params with & when the path already has a query string", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(null, { status: 204 }));
    const client = createRequestClient({ fetch: fetchMock });

    await client.request("/search?scope=all", { params: { page: 2 } });

    expect(fetchMock.mock.calls[0]?.[0]).toBe("/search?scope=all&page=2");
  });

  // 查询参数中的 null 和 undefined 应被跳过，不会生成空键或 undefined 字面量。
  it("omits null and undefined query params", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(null, { status: 204 }));
    const client = createRequestClient({ fetch: fetchMock });

    await client.request("/users", {
      params: { page: 2, keyword: undefined, roleId: null },
    });

    expect(fetchMock.mock.calls[0]?.[0]).toBe("/users?page=2");
  });

  // 普通对象请求体应自动序列化为 JSON 字符串，并自动补齐 application/json。
  it("serializes a plain object body and sets the content type", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(null, { status: 204 }));
    const client = createRequestClient({ fetch: fetchMock });

    await client.request("/users", {
      method: "POST",
      body: { name: "Alice", age: 28 },
    });

    const init = fetchMock.mock.calls[0]?.[1];
    expect(init?.body).toBe(JSON.stringify({ name: "Alice", age: 28 }));
    expect(new Headers(init?.headers).get("content-type")).toBe(
      "application/json"
    );
  });

  // 调用方显式设置的 content-type 优先，自动补齐逻辑不得覆盖。
  it("keeps an explicit content-type header with an object body", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(null, { status: 204 }));
    const client = createRequestClient({ fetch: fetchMock });

    await client.request("/users", {
      method: "POST",
      headers: { "content-type": "application/vnd.api+json" },
      body: { name: "Alice" },
    });

    const init = fetchMock.mock.calls[0]?.[1];
    expect(init?.body).toBe(JSON.stringify({ name: "Alice" }));
    expect(new Headers(init?.headers).get("content-type")).toBe(
      "application/vnd.api+json"
    );
  });

  // FormData、URLSearchParams 等表单请求体应保持原样，不做 JSON 序列化。
  it("does not stringify a FormData body", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(null, { status: 204 }));
    const client = createRequestClient({ fetch: fetchMock });

    const formData = new FormData();
    formData.append("file", "upload-content");

    await client.request("/upload", { method: "POST", body: formData });

    const formDataInit = fetchMock.mock.calls[0]?.[1];
    expect(formDataInit?.body).toBe(formData);
    expect(new Headers(formDataInit?.headers).get("content-type")).toBeNull();

    const urlSearchParams = new URLSearchParams({ keyword: "hello" });

    await client.request("/search", { method: "POST", body: urlSearchParams });

    expect(fetchMock.mock.calls[1]?.[1]?.body).toBe(urlSearchParams);
  });

  // ReadableStream 属于原生请求体，不应被 JSON.stringify 破坏成 undefined。
  it("does not stringify a ReadableStream body", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(null, { status: 204 }));
    const client = createRequestClient({ fetch: fetchMock });
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode("stream-content"));
        controller.close();
      },
    });

    await client.request("/upload", { method: "POST", body: stream });

    const streamInit = fetchMock.mock.calls[0]?.[1];
    expect(streamInit?.body).toBe(stream);
    expect(new Headers(streamInit?.headers).get("content-type")).toBeNull();
  });

  // responseType 为 blob 时应返回 Blob 实例，适合文件下载等二进制场景。
  it("returns a Blob instance when responseType is blob", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response("binary-content", {
        headers: { "content-type": "application/octet-stream" },
      })
    );
    const client = createRequestClient({ fetch: fetchMock });

    const result = await client.request<Blob>("/files/report", {
      responseType: "blob",
    });

    expect(result).toBeInstanceOf(Blob);
    expect(await result.text()).toBe("binary-content");
  });

  // responseType 为 arrayBuffer 时应返回 ArrayBuffer 实例。
  it("returns an ArrayBuffer instance when responseType is arrayBuffer", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response("binary-content", {
        headers: { "content-type": "application/octet-stream" },
      })
    );
    const client = createRequestClient({ fetch: fetchMock });

    const result = await client.request<ArrayBuffer>("/files/report", {
      responseType: "arrayBuffer",
    });

    expect(result).toBeInstanceOf(ArrayBuffer);
    expect(result.byteLength).toBe("binary-content".length);
  });

  // responseType 为 json 时即使 Content-Type 不是 application/json 也应按 JSON 解析。
  it("parses JSON regardless of content type when responseType is json", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ code: 0, data: [1, 2] }), {
        headers: { "content-type": "text/html" },
      })
    );
    const client = createRequestClient({ fetch: fetchMock });

    await expect(
      client.request<{ code: number }>("/dashboard", { responseType: "json" })
    ).resolves.toEqual({ code: 0, data: [1, 2] });
  });

  // responseType 为 text 时应返回原始字符串，即使 Content-Type 是 JSON 也不解析。
  it("returns raw text regardless of content type when responseType is text", async () => {
    const rawBody = JSON.stringify({ code: 0 });
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(rawBody, {
        headers: { "content-type": "application/json" },
      })
    );
    const client = createRequestClient({ fetch: fetchMock });

    await expect(
      client.request<string>("/dashboard", { responseType: "text" })
    ).resolves.toBe(rawBody);
  });

  // 204 按 HTTP 语义没有响应体，显式 responseType 也应返回 undefined。
  it("returns undefined for a 204 response regardless of responseType", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(null, { status: 204 }));
    const client = createRequestClient({ fetch: fetchMock });

    await expect(
      client.request("/files/report", { responseType: "blob" })
    ).resolves.toBeUndefined();
    await expect(
      client.request("/files/report", { responseType: "text" })
    ).resolves.toBeUndefined();

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  // 错误响应始终按 auto 模式解析，即使 responseType 是 blob，HttpError.payload 仍可读。
  it("keeps the HttpError payload readable when responseType is blob", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ code: "FILE_NOT_FOUND" }), {
        status: 404,
        statusText: "Not Found",
        headers: { "content-type": "application/json" },
      })
    );
    const client = createRequestClient({ fetch: fetchMock });

    const request = client.request("/files/report", {
      responseType: "blob",
    });

    await expect(request).rejects.toMatchObject({
      name: "HttpError",
      status: 404,
      payload: { code: "FILE_NOT_FOUND" },
    });
  });
});
