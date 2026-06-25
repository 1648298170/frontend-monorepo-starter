// 引入文件与目录命名检查插件。
import checkFile from "eslint-plugin-check-file";

// 定义需要执行 TypeScript 标识符命名检查的源码文件。
const typeScriptSourceFiles = [
  "apps/**/*.{ts,tsx}", // 匹配所有应用中的 TypeScript 源码。
  "packages/**/*.{ts,tsx}", // 匹配所有共享包中的 TypeScript 源码。
]; // TypeScript 源码匹配列表结束。

// 定义需要执行文件和目录命名检查的应用与包源码。
const namedSourceFiles = [
  "apps/**/*.{js,jsx,ts,tsx,vue}", // 匹配应用源码和 Vue 单文件组件。
  "packages/**/*.{js,jsx,ts,tsx,vue}", // 匹配共享包源码和 Vue 单文件组件。
]; // 文件与目录命名匹配列表结束。

// 导出命名规范 ESLint 配置。
export const namingConfig = [
  {
    // 仅对 TypeScript 源码执行标识符命名规则。
    files: typeScriptSourceFiles,
    // 定义 TypeScript 标识符命名约束。
    rules: {
      // 使用 typescript-eslint 提供的细粒度命名规则。
      "@typescript-eslint/naming-convention": [
        "error", // 命名不符合规范时阻断 Lint。
        {
          selector: "typeLike", // 匹配 interface、type、class 和 enum 等类型声明。
          format: ["PascalCase"], // 类型统一使用 PascalCase。
        }, // 类型命名规则结束。
        {
          selector: "function", // 匹配函数声明、函数表达式和方法。
          format: ["camelCase", "PascalCase"], // 普通函数使用 camelCase，组件允许 PascalCase。
        }, // 函数命名规则结束。
        {
          selector: "parameter", // 匹配函数参数。
          format: ["camelCase"], // 参数统一使用 camelCase。
          leadingUnderscore: "allow", // 允许使用前导下划线标识有意未使用的参数。
        }, // 参数命名规则结束。
        {
          selector: "variable", // 匹配局部变量和模块级变量。
          format: ["camelCase", "PascalCase", "UPPER_CASE"], // 兼容普通变量、组件和全局常量。
          leadingUnderscore: "allow", // 允许内部变量使用前导下划线。
        }, // 变量命名规则结束。
      ], // TypeScript 标识符命名规则结束。
    }, // TypeScript 命名规则集合结束。
  }, // TypeScript 标识符命名配置块结束。
  {
    // 对应用和共享包源码执行文件及目录命名检查。
    files: namedSourceFiles,
    // 注册文件命名插件。
    plugins: {
      "check-file": checkFile, // 以 check-file 名称注册插件。
    }, // 文件命名插件注册结束。
    // 定义低误报的文件与目录命名规则。
    rules: {
      // 按文件职责约束文件名格式。
      "check-file/filename-naming-convention": [
        "error", // 文件名不符合规范时阻断 Lint。
        {
          "**/components/**/*.{tsx,vue}": "PASCAL_CASE", // React 和 Vue 组件文件使用 PascalCase。
          "**/pages/**/*.{tsx,vue}": "PASCAL_CASE", // 页面组件文件使用 PascalCase。
          "**/*.store.ts": "KEBAB_CASE", // Store 文件使用 kebab-case.store.ts。
          "**/*.routes.{ts,tsx}": "KEBAB_CASE", // 路由模块使用 kebab-case.routes.ts(x)。
          "**/*.types.ts": "KEBAB_CASE", // 类型文件使用 kebab-case.types.ts。
          "**/*.schema.ts": "KEBAB_CASE", // Schema 文件使用 kebab-case.schema.ts。
          "**/*.api.ts": "KEBAB_CASE", // API 文件使用 kebab-case.api.ts。
          "**/*.service.ts": "KEBAB_CASE", // Service 文件使用 kebab-case.service.ts。
        }, // 文件职责与命名格式映射结束。
        {
          ignoreMiddleExtensions: true, // 忽略 .store、.routes 等职责后缀，只检查主体名称。
        }, // 文件命名规则选项结束。
      ], // 文件命名规则结束。
      // 约束 src 下的业务目录统一使用 kebab-case。
      "check-file/folder-naming-convention": [
        "error", // 目录名不符合规范时阻断 Lint。
        {
          "apps/*/src/**/": "KEBAB_CASE", // 应用源码目录使用 kebab-case。
          "packages/*/*/src/**/": "KEBAB_CASE", // 两级 packages 源码目录使用 kebab-case。
        }, // 目录范围与命名格式映射结束。
      ], // 目录命名规则结束。
    }, // 文件与目录命名规则集合结束。
  }, // 文件与目录命名配置块结束。
]; // 命名规范配置数组结束。
