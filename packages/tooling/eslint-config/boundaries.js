// 定义需要执行依赖边界检查的全部源码文件。
const sourceFiles = [
  "apps/**/*.{js,jsx,ts,tsx,vue}", // 匹配所有应用源码。
  "packages/**/*.{js,jsx,ts,tsx,vue}", // 匹配所有共享包源码。
]; // 源码文件匹配列表结束。

// 导出 monorepo 依赖方向和框架隔离规则。
export const boundaryConfig = [
  {
    files: sourceFiles, // 对所有源码执行公共包入口检查。
    rules: {
      "no-restricted-imports": [
        "error", // 非法跨边界导入直接作为错误处理。
        {
          patterns: [
            {
              group: [
                "@repo/*/src/**", // 禁止绕过 workspace 包 public exports。
                "apps/**", // 禁止通过仓库路径直接导入其他应用。
                "packages/**/src/**", // 禁止通过物理路径导入包内部实现。
              ], // 公共限制路径模式结束。
              message:
                "Import from a package public entry declared in package.json exports.", // 给出修复方向。
            }, // 公共路径限制结束。
          ], // 公共限制模式列表结束。
        }, // 公共导入限制选项结束。
      ], // 公共导入限制规则结束。
    }, // 公共边界规则结束。
  }, // 公共边界配置块结束。
  {
    files: ["packages/shared/**/*.{js,ts}"], // 只匹配框架无关 shared 包。
    rules: {
      "no-restricted-imports": [
        "error", // shared 包依赖框架时直接报错。
        {
          paths: [
            { name: "react" }, // 禁止直接依赖 React。
            { name: "react-dom" }, // 禁止直接依赖 React DOM。
            { name: "vue" }, // 禁止直接依赖 Vue。
            { name: "@repo/react-ui" }, // 禁止依赖 React UI 包入口。
            { name: "@repo/vue-ui" }, // 禁止依赖 Vue UI 包入口。
          ], // shared 包禁止的精确模块结束。
          patterns: [
            {
              group: [
                "react/**", // 禁止 React 子路径。
                "react-dom/**", // 禁止 React DOM 子路径。
                "vue/**", // 禁止 Vue 子路径。
                "@repo/react-ui/**", // 禁止 React UI 子入口。
                "@repo/vue-ui/**", // 禁止 Vue UI 子入口。
                "@repo/react-*", // 禁止依赖所有 React 框架适配包。
                "@repo/react-*/**", // 禁止依赖 React 框架适配包子入口。
                "@repo/vue-*", // 禁止依赖所有 Vue 框架适配包。
                "@repo/vue-*/**", // 禁止依赖 Vue 框架适配包子入口。
              ], // shared 包禁止模式结束。
              message:
                "Shared packages must remain independent from React and Vue.", // 说明 shared 必须框架无关。
            }, // shared 模式限制结束。
          ], // shared 限制模式列表结束。
        }, // shared 导入限制选项结束。
      ], // shared 导入限制规则结束。
    }, // shared 边界规则结束。
  }, // shared 边界配置块结束。
  {
    files: [
      "apps/react-*/**/*.{js,jsx,ts,tsx}", // 兼容使用 react-* 命名的 React 应用。
      "packages/react/**/*.{js,jsx,ts,tsx}", // 匹配 React 框架适配包源码。
    ], // React 生态源码范围结束。
    rules: {
      "no-restricted-imports": [
        "error", // React 应用跨入 Vue 生态时直接报错。
        {
          paths: [
            { name: "vue" }, // 禁止 Vue 核心包。
            { name: "@repo/vue-ui" }, // 禁止 Vue UI 包。
          ], // React 应用禁止的精确模块结束。
          patterns: [
            {
              group: [
                "vue/**", // 禁止 Vue 子路径。
                "@repo/vue-*", // 禁止所有 Vue 框架适配包。
                "@repo/vue-*/**", // 禁止 Vue 框架适配包子入口。
              ], // React 应用禁止的 Vue 模块模式结束。
              message: "React applications must not depend on Vue modules.", // 说明框架隔离要求。
            }, // React 应用模式限制结束。
          ], // React 应用限制模式列表结束。
        }, // React 应用导入限制选项结束。
      ], // React 应用导入限制规则结束。
    }, // React 应用边界规则结束。
  }, // React 应用边界配置块结束。
  {
    files: [
      "apps/vue-*/**/*.{js,ts,vue}", // 兼容使用 vue-* 命名的 Vue 应用。
      "packages/vue/**/*.{js,ts,vue}", // 匹配 Vue 框架适配包源码。
    ], // Vue 生态源码范围结束。
    rules: {
      "no-restricted-imports": [
        "error", // Vue 应用跨入 React 生态时直接报错。
        {
          paths: [
            { name: "react" }, // 禁止 React 核心包。
            { name: "react-dom" }, // 禁止 React DOM。
            { name: "@repo/react-ui" }, // 禁止 React UI 包。
          ], // Vue 应用禁止的精确模块结束。
          patterns: [
            {
              group: [
                "react/**", // 禁止 React 子路径。
                "react-dom/**", // 禁止 React DOM 子路径。
                "@repo/react-*", // 禁止所有 React 框架适配包。
                "@repo/react-*/**", // 禁止 React 框架适配包子入口。
              ], // Vue 应用禁止模式结束。
              message: "Vue applications must not depend on React modules.", // 说明框架隔离要求。
            }, // Vue 应用模式限制结束。
          ], // Vue 应用限制模式列表结束。
        }, // Vue 应用导入限制选项结束。
      ], // Vue 应用导入限制规则结束。
    }, // Vue 应用边界规则结束。
  }, // Vue 应用边界配置块结束。
]; // 边界配置数组结束。

// 动态应用边界根据 package.json 识别框架，不要求业务应用名称携带 react/vue 前缀。
export function createAppBoundaryConfig({
  reactAppDirectories,
  vueAppDirectories,
}) {
  const configs = [];

  if (reactAppDirectories.length > 0) {
    configs.push({
      files: reactAppDirectories.map(
        (directory) => `${directory}/**/*.{js,jsx,ts,tsx}`
      ),
      rules: {
        "no-restricted-imports": [
          "error",
          {
            paths: [{ name: "vue" }, { name: "@repo/vue-ui" }],
            patterns: [
              {
                group: ["vue/**", "@repo/vue-*", "@repo/vue-*/**"],
                message: "React applications must not depend on Vue modules.",
              },
            ],
          },
        ],
      },
    });
  }

  if (vueAppDirectories.length > 0) {
    configs.push({
      files: vueAppDirectories.map(
        (directory) => `${directory}/**/*.{js,ts,vue}`
      ),
      rules: {
        "no-restricted-imports": [
          "error",
          {
            paths: [
              { name: "react" },
              { name: "react-dom" },
              { name: "@repo/react-ui" },
            ],
            patterns: [
              {
                group: [
                  "react/**",
                  "react-dom/**",
                  "@repo/react-*",
                  "@repo/react-*/**",
                ],
                message: "Vue applications must not depend on React modules.",
              },
            ],
          },
        ],
      },
    });
  }

  return configs;
}
