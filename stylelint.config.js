// 导出 Stylelint 的 ESM 配置对象。
export default {
  // 按顺序继承基础 CSS、SCSS 和 Vue SFC 推荐规则。
  extends: [
    "stylelint-config-standard", // 启用标准 CSS 语法和代码质量规则。
    "stylelint-config-standard-scss", // 增加 SCSS 语法及标准规则。
    "stylelint-config-recommended-vue/scss", // 使用 SCSS 语法检查 Vue 的 style 块。
  ], // 共享配置继承列表结束。

  // 统一忽略依赖、构建结果、覆盖率和任务缓存目录。
  ignoreFiles: [
    "**/dist/**", // 忽略 Vite 等工具生成的生产构建产物。
    "**/coverage/**", // 忽略测试覆盖率工具生成的报告。
    "**/node_modules/**", // 忽略第三方依赖中的样式文件。
    "**/.turbo/**", // 忽略 Turborepo 任务缓存和日志。
  ], // 忽略文件列表结束。

  // 定义全仓默认生效的 Stylelint 规则。
  rules: {
    // 强制作者编写的 CSS 类名使用 kebab-case 或 BEM。
    "selector-class-pattern": [
      "^[a-z][a-z0-9]*(?:-[a-z0-9]+)*(?:__[a-z0-9]+(?:-[a-z0-9]+)*)?(?:--[a-z0-9]+(?:-[a-z0-9]+)*)?$",
      {
        message: "CSS 类名应使用 kebab-case 或 BEM。",
      },
    ],
    // 未知 at-rule 检查使用共享配置的默认行为，天然拦截 Tailwind、UnoCSS
    // 等原子 CSS 指令（@apply、@theme、@utility 等），不要为消报错而放行。
  }, // 全仓默认规则结束。

  // 为特定目录追加更严格或不同的局部规则。
  overrides: [
    {
      // 仅匹配独立的 Sass 和 SCSS 文件。
      files: ["**/*.{sass,scss}"],

      // 使用 SCSS 专用规则识别 @use、@forward 等 Sass 指令。
      rules: {
        // 关闭不理解 Sass 指令的基础 CSS 未知 at-rule 检查。
        "at-rule-no-unknown": null,
      }, // Sass 和 SCSS 局部规则结束。
    }, // Sass 和 SCSS 配置覆盖结束。
    {
      // 匹配集中维护的第三方组件库样式覆盖目录。
      files: ["**/vendor-overrides/**/*.{css,scss,sass,vue}"],

      // 第三方类名不受本仓库命名规范控制。
      rules: {
        // 允许覆盖 Element Plus、Ant Design 等第三方选择器。
        "selector-class-pattern": null,
      }, // 第三方样式覆盖局部规则结束。
    }, // 第三方样式覆盖配置结束。
    {
      // 仅匹配共享 Design Token 包中的 CSS 文件。
      files: ["packages/shared/design-tokens/**/*.css"],

      // Design Token 包的局部规则。
      rules: {
        // 强制共享 CSS 变量使用 --repo-* 命名空间。
        "custom-property-pattern": "^repo-[a-z0-9-]+$",
      }, // Design Token 局部规则结束。
    }, // Design Token 配置覆盖结束。
  ], // 配置覆盖列表结束。
}; // Stylelint 配置对象结束。
