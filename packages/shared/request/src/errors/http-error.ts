// 表示服务端已经返回响应，但 HTTP 状态不属于成功范围。
export class HttpError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly payload: unknown,
    readonly url?: string
  ) {
    super(message);
    this.name = "HttpError";
  }
}
