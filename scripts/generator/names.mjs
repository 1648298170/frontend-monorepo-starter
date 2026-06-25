// 本模块是生成器唯一的命名转换入口，避免不同生成类型各自实现一套规则。
// 将 kebab-case、snake_case、空格和 camelCase 统一拆成单词数组。
function splitWords(value) {
  const words = String(value)
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map((word) => word.toLowerCase());

  if (words.length === 0) {
    throw new Error("名称不能为空，且必须包含字母或数字。");
  }

  if (!/^[a-z]/.test(words[0])) {
    // 生成的组件、类型和函数都需要成为合法的 JavaScript 标识符。
    throw new Error("名称必须以字母开头。");
  }

  return words;
}

// 目录和职责文件主体统一使用 kebab-case。
export function toKebabCase(value) {
  return splitWords(value).join("-");
}

// React/Vue 组件、页面和类型统一使用 PascalCase。
export function toPascalCase(value) {
  return splitWords(value)
    .map((word) => `${word[0].toUpperCase()}${word.slice(1)}`)
    .join("");
}

// 职责后缀只追加一次，例如 audit-page 和 AuditPage 都转换为 AuditPage。
export function toSuffixedPascalCase(value, suffix) {
  const words = splitWords(value);
  const normalizedSuffix = suffix.toLowerCase();
  const baseWords =
    words.at(-1) === normalizedSuffix ? words.slice(0, -1) : words;

  if (baseWords.length === 0) {
    throw new Error(`名称不能只有 ${suffix}。`);
  }

  return `${toPascalCase(baseWords.join("-"))}${suffix}`;
}

// Hook/Composable 允许输入 pagination、use-pagination 或 usePagination。
export function toUseName(value) {
  const words = splitWords(value);
  const normalizedWords = words[0] === "use" ? words.slice(1) : words;

  if (normalizedWords.length === 0) {
    throw new Error("Hook 或 Composable 名称不能只有 use。");
  }

  return `use${toPascalCase(normalizedWords.join("-"))}`;
}

// 将名称转换为可展示标题，例如 order-detail -> Order Detail。
export function toDisplayName(value) {
  return splitWords(value)
    .map((word) => `${word[0].toUpperCase()}${word.slice(1)}`)
    .join(" ");
}
