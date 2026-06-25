export default {
  // (x) => {}，单个参数箭头函数是否显示小括号（always：始终显示；avoid：省略括号；默认 always）
  arrowParens: "always",
  // 开始标签的右尖括号是否跟随在最后一行属性末尾，默认 false
  bracketSameLine: false,
  // 对象字面量的括号之间是否打印空格
  bracketSpacing: true,
  // 是否格式化一些文件中嵌入的代码片段（auto | off；默认 auto）
  embeddedLanguageFormatting: "auto",
  // 指定 HTML 文件的空格敏感度（css | strict | ignore；默认 css）
  htmlWhitespaceSensitivity: "css",
  // 格式化后是否在文件顶部插入特殊的 @format 标记，默认 false
  insertPragma: false,
  // 在 JSX 中是否使用单引号替代双引号，默认 false
  jsxSingleQuote: false,
  // 每行最多字符数量，超出后换行，默认 80
  printWidth: 80,
  // Markdown 文本换行方式（always | never | preserve）
  proseWrap: "preserve",
  // 对象属性引号策略（as-needed | consistent | preserve）
  quoteProps: "as-needed",
  // 是否只格式化文件顶部包含 @prettier 或 @format 注释的文件，默认 false
  requirePragma: false,
  // 结尾添加分号
  semi: true,
  // 是否使用单引号
  singleQuote: false,
  // 缩进空格数
  tabWidth: 2,
  // 元素末尾逗号策略
  trailingComma: "es5",
  // 使用空格而不是 Tab 缩进
  useTabs: false,
  // Vue 文件中是否缩进 <style> 和 <script> 标签
  vueIndentScriptAndStyle: false,
  // 换行符跟随当前文件
  endOfLine: "auto",
  overrides: [
    {
      files: "*.html",
      options: {
        parser: "html",
      },
    },
  ],
};
