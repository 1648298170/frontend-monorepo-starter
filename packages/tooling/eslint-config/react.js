// 引入 React Hooks 官方 ESLint 插件。
import reactHooks from "eslint-plugin-react-hooks";
// 引入 React Fast Refresh 的导出约束插件。
import reactRefresh from "eslint-plugin-react-refresh";

// 导出 React 应用与 React 包共用的规则。
export const reactConfig = [
  {
    // 保留 react-* 目录约定兼容旧消费者，其他业务应用由动态工厂补充。
    files: [
      "apps/react-*/**/*.{js,jsx,ts,tsx}",
      "packages/react/**/*.{js,jsx,ts,tsx}",
    ],
    plugins: {
      "react-hooks": reactHooks, // 注册 React Hooks 插件。
    }, // React 通用插件结束。
    rules: {
      ...reactHooks.configs.recommended.rules, // 启用 Hooks 调用顺序和依赖检查规则。
    }, // React 通用规则结束。
  }, // React 通用配置块结束。
]; // React 通用配置数组结束。

// 根据根配置识别出的应用目录生成 Hooks 与 Fast Refresh 规则。
export function createReactAppConfig(appDirectories) {
  const sourceFiles = appDirectories.map(
    (directory) => `${directory}/**/*.{js,jsx,ts,tsx}`
  );
  const componentFiles = appDirectories.map(
    (directory) => `${directory}/**/*.{jsx,tsx}`
  );

  if (appDirectories.length === 0) {
    return [];
  }

  return [
    {
      files: sourceFiles,
      plugins: {
        "react-hooks": reactHooks,
      },
      rules: {
        ...reactHooks.configs.recommended.rules,
      },
    },
    {
      files: componentFiles,
      plugins: {
        "react-refresh": reactRefresh,
      },
      rules: {
        "react-refresh/only-export-components": [
          "warn",
          { allowConstantExport: true },
        ],
      },
    },
  ];
}

// 保留旧导出以兼容已有消费者；根配置改用动态工厂。
export const reactAppConfig = [
  {
    files: ["apps/react-*/**/*.{jsx,tsx}"],
    plugins: {
      "react-refresh": reactRefresh,
    },
    rules: {
      "react-refresh/only-export-components": [
        "warn",
        { allowConstantExport: true },
      ],
    },
  },
];
