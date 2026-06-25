// 引入 browser、node 等运行环境的标准全局变量定义。
import globals from "globals";

// 导出浏览器运行环境配置。
export const browserConfig = [
  {
    // 只为实际运行在浏览器中的源码启用浏览器全局变量。
    files: [
      "apps/**/*.{js,jsx,ts,tsx,vue}", // 匹配所有前端应用源码。
      "templates/apps/**/*.{js,jsx,ts,tsx,vue}", // 应用模板同样运行在浏览器环境中。
      "packages/react/**/*.{js,jsx,ts,tsx}", // 匹配 React 框架包。
      "packages/vue/**/*.{js,ts,vue}", // 匹配 Vue 框架包。
      "packages/shared/request/**/*.{js,ts}", // Fetch 请求包依赖浏览器类型和全局对象。
    ], // 浏览器源码匹配列表结束。
    languageOptions: {
      globals: globals.browser, // 声明 window、document、fetch 等浏览器全局变量。
    }, // 浏览器语言选项结束。
  }, // 浏览器配置块结束。
]; // 浏览器配置数组结束。
