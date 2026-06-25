// 引入 Node.js 等运行环境的标准全局变量定义。
import globals from "globals";

// 导出 Node.js 运行环境配置。
export const nodeConfig = [
  {
    // 为根配置、通用配置文件和 tooling 源码启用 Node.js 全局变量。
    files: [
      "*.{js,ts}", // 匹配仓库根目录的 JavaScript 和 TypeScript 文件。
      "**/*.config.{js,ts}", // 匹配任意层级的工具配置文件。
      "scripts/**/*.{js,mjs,cjs,ts}", // 匹配仓库维护脚本并启用 Node.js 全局变量。
      "packages/tooling/**/*.{js,ts}", // 匹配共享工程配置包源码。
    ], // Node.js 文件匹配列表结束。
    languageOptions: {
      globals: globals.node, // 声明 process、Buffer、__dirname 等 Node.js 全局变量。
    }, // Node.js 语言选项结束。
  }, // Node.js 配置块结束。
]; // Node.js 配置数组结束。
