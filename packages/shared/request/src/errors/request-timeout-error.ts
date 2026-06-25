// 单独表示客户端超时，便于应用和用户主动取消操作区分。
export class RequestTimeoutError extends Error {
  constructor(
    readonly timeoutMs: number,
    readonly url: string
  ) {
    super(`Request timed out after ${timeoutMs}ms`);
    this.name = "RequestTimeoutError";
  }
}
