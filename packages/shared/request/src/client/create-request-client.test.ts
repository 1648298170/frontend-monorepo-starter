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
});
