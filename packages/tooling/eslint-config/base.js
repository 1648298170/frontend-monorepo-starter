// 引入 ESLint 官方 JavaScript 推荐规则。
import js from "@eslint/js";
// 引入 TypeScript ESLint 的解析器和推荐规则集合。
import tseslint from "typescript-eslint";

// 导出所有 JavaScript、TypeScript 文件都需要的基础配置。
export const baseConfig = [
  js.configs.recommended, // 启用 ESLint 官方推荐的 JavaScript 规则。
  ...tseslint.configs.recommended, // 展开 TypeScript ESLint 推荐规则数组。
  {
    // 设置所有源码共用的语言解析选项。
    languageOptions: {
      ecmaVersion: "latest", // 使用 ESLint 当前支持的最新 ECMAScript 语法。
      sourceType: "module", // 按 ESM 模块解析 import 和 export。
    }, // 基础语言选项结束。
  }, // 基础语言配置块结束。
]; // 基础配置数组结束。
