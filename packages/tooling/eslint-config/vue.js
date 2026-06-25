// 引入 Vue 官方 ESLint 插件及其 Flat Config。
import vue from "eslint-plugin-vue";
// 引入 TypeScript 解析器，供 Vue SFC 的 script 块使用。
import tseslint from "typescript-eslint";

// 导出 Vue 应用和 Vue 包共用的配置。
export const vueConfig = [
  ...vue.configs["flat/recommended"], // 启用 Vue 官方推荐的模板与 SFC 规则。
  {
    // 保留 vue-* 目录约定兼容旧消费者，其他业务应用由动态工厂补充。
    files: ["apps/vue-*/**/*.{ts,vue}", "packages/vue/**/*.{ts,vue}"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off", // 允许业务接入阶段使用 any。
      "@typescript-eslint/no-unused-expressions": "off", // 兼容 Vue 模板编译产生的表达式模式。
    }, // Vue TypeScript 规则结束。
  }, // Vue TypeScript 配置块结束。
  {
    // 以下解析器与模板规则只作用于 .vue 单文件组件。
    files: ["apps/vue-*/**/*.vue", "packages/vue/**/*.vue"],
    languageOptions: {
      parserOptions: {
        parser: tseslint.parser, // 使用 TypeScript 解析 Vue script 块。
      }, // Vue 解析器选项结束。
    }, // Vue 语言选项结束。
    rules: {
      "vue/attribute-hyphenation": "off", // 不强制模板属性使用连字符形式。
      "vue/attributes-order": "off", // 不强制模板属性排列顺序。
      "vue/first-attribute-linebreak": "off", // 属性首行换行交给 Prettier。
      "vue/max-attributes-per-line": "off", // 每行属性数量交给 Prettier。
      "vue/multi-word-component-names": "off", // 允许 App、Home 等单词组件名。
      "vue/singleline-html-element-content-newline": "off", // 单行内容换行交给 Prettier。
    }, // Vue SFC 规则结束。
  }, // Vue SFC 配置块结束。
]; // Vue 配置数组结束。

// 根据根配置识别出的 Vue 应用目录生成 TypeScript 与 SFC 规则。
export function createVueAppConfig(appDirectories) {
  if (appDirectories.length === 0) {
    return [];
  }

  return [
    {
      files: appDirectories.map((directory) => `${directory}/**/*.{ts,vue}`),
      rules: {
        "@typescript-eslint/no-explicit-any": "off",
        "@typescript-eslint/no-unused-expressions": "off",
      },
    },
    {
      files: appDirectories.map((directory) => `${directory}/**/*.vue`),
      languageOptions: {
        parserOptions: {
          parser: tseslint.parser,
        },
      },
      rules: {
        "vue/attribute-hyphenation": "off",
        "vue/attributes-order": "off",
        "vue/first-attribute-linebreak": "off",
        "vue/max-attributes-per-line": "off",
        "vue/multi-word-component-names": "off",
        "vue/singleline-html-element-content-newline": "off",
      },
    },
  ];
}
