// JavaScript 允许抛出任意值，这里统一转换为 Error 供监控平台消费。
export function normalizeError(error: unknown): Error {
  if (error instanceof Error) {
    return error;
  }

  if (typeof error === "string") {
    return new Error(error);
  }

  return new Error("Unknown application error", { cause: error });
}
