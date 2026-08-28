import type { ResponseBodyType } from "../client/request-client.types";

// 根据响应状态和 Content-Type，将响应体解析为 JSON、文本或空值。
// responseType 缺省时按 Content-Type 自动判断；显式指定时强制使用对应读取方式。
export async function readResponsePayload(
  response: Response,
  responseType?: ResponseBodyType
) {
  // 204/205 按 HTTP 语义没有响应体，无需继续读取。
  if (response.status === 204 || response.status === 205) {
    return undefined;
  }

  // 二进制模式直接使用对应的 Response 读取方法，绕过文本转换。
  if (responseType === "blob") {
    return response.blob();
  }

  if (responseType === "arrayBuffer") {
    return response.arrayBuffer();
  }

  const contentType = response.headers.get("content-type");
  // Response body 只能消费一次，因此先统一读取文本，再按类型转换。
  const content = await response.text();

  if (responseType === "text") {
    return content;
  }

  // json 模式不依赖 Content-Type，只要响应体非空就按 JSON 解析。
  if (responseType === "json") {
    return content ? (JSON.parse(content) as unknown) : undefined;
  }

  if (!content) {
    return undefined;
  }

  // JSON 响应转换为未知类型，由具体接口调用方通过泛型声明结果结构。
  if (contentType?.includes("application/json")) {
    return JSON.parse(content) as unknown;
  }

  return content;
}
