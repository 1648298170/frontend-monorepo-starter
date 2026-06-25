// 引入 React Hooks 官方 ESLint 插件。
import reactHooks from "eslint-plugin-react-hooks";
// 引入 React Fast Refresh 的导出约束插件。
import reactRefresh from "eslint-plugin-react-refresh";

// 导出 React 应用与 React 包共用的规则。
export const reactConfig = [
  {
    // 根据目录约定匹配 React 应用和 React 框架包。
    files: [
      "apps/react-*/**/*.{js,jsx,ts,tsx}", // 匹配所有 react-* 应用。
      "packages/react/**/*.{js,jsx,ts,tsx}", // 匹配共享 React 包。
    ], // React 文件匹配列表结束。
    plugins: {
      "react-hooks": reactHooks, // 注册 React Hooks 插件。
    }, // React 通用插件结束。
    rules: {
      ...reactHooks.configs.recommended.rules, // 启用 Hooks 调用顺序和依赖检查规则。
    }, // React 通用规则结束。
  }, // React 通用配置块结束。
]; // React 通用配置数组结束。

// 导出仅适用于 Vite React 应用的 Fast Refresh 规则。
export const reactAppConfig = [
  {
    files: ["apps/react-*/**/*.{jsx,tsx}"], // 只匹配 React 应用组件文件。
    plugins: {
      "react-refresh": reactRefresh, // 注册 React Fast Refresh 插件。
    }, // React 应用插件结束。
    rules: {
      "react-refresh/only-export-components": [
        "warn", // 使用警告避免非关键问题阻断开发。
        { allowConstantExport: true }, // 允许组件文件同时导出不会破坏热更新的常量。
      ], // Fast Refresh 规则选项结束。
    }, // React 应用规则结束。
  }, // React 应用配置块结束。
]; // React 应用配置数组结束。
