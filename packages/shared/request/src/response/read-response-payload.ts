// 根据响应状态和 Content-Type，将响应体解析为 JSON、文本或空值。
export async function readResponsePayload(response: Response) {
  // 204/205 按 HTTP 语义没有响应体，无需继续读取。
  if (response.status === 204 || response.status === 205) {
    return undefined;
  }

  const contentType = response.headers.get("content-type");
  // Response body 只能消费一次，因此先统一读取文本，再按类型转换。
  const content = await response.text();

  if (!content) {
    return undefined;
  }

  // JSON 响应转换为未知类型，由具体接口调用方通过泛型声明结果结构。
  if (contentType?.includes("application/json")) {
    return JSON.parse(content) as unknown;
  }

  return content;
}
