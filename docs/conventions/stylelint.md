# Stylelint 规范

仓库使用 Stylelint 17 统一检查 CSS、SCSS、Sass 和 Vue SFC 样式。

## 配置组成

根目录 `stylelint.config.js` 组合：

- `stylelint-config-standard`
- `stylelint-config-standard-scss`
- `stylelint-config-recommended-vue/scss`

配置覆盖以下文件：

```txt
apps/**/*.{css,scss,sass,vue}
packages/**/*.{css,scss,sass,vue}
```

构建产物、依赖目录、覆盖率和 Turbo 缓存会被忽略。

## 禁止原子 CSS 库

本仓库不使用 Tailwind CSS、UnoCSS 等原子 CSS（utility-first）方案，样式统一由
Sass/SCSS + BEM 命名 + Stylelint 规则承载。

- 不要安装 Tailwind、UnoCSS、Windi CSS 等原子 CSS 依赖。
- 不要在样式中使用 `@apply`、`@theme`、`@utility` 等原子 CSS 指令；Stylelint 的
  未知 at-rule 检查会直接报错。
- 页面与组件样式写在应用的 `.scss` 文件或 Vue SFC 的 `<style lang="scss">` 中，
  类名遵循 kebab-case 或 BEM（见 naming.md）。
- 通用视觉规则沉淀到 `packages/shared/design-tokens` 或 UI 包，避免各应用重复。

## Design Tokens

`packages/shared/design-tokens` 中的共享 CSS 变量统一使用：

```css
--repo-*
```

例如：

```css
--repo-ui-color-text: #172033;
```

该规则只作用于共享 Design Token 包。应用和其他 package 可以定义自己的变量命名空间：

```css
:root {
  --admin-color-primary: #2563eb;
  --portal-page-gap: 24px;
}
```

建议每个应用选择稳定且唯一的前缀，避免全局 CSS 变量冲突。应用是否导入共享
Design Token、覆盖部分 Token，或维护完全独立的变量体系，由应用自行决定。

## 命令

检查全部样式：

```bash
pnpm lint:style
```

自动修复：

```bash
pnpm lint:style:fix
```

根目录 `pnpm lint` 会依次执行 ESLint/Turbo 检查和 Stylelint。

## 编辑器与提交

- VS Code 推荐安装官方 Stylelint 扩展。
- 保存时执行 `source.fixAll.stylelint`。
- lint-staged 对 CSS/SCSS 执行 Prettier 后再执行 Stylelint。
- Vue 文件依次执行 Prettier、ESLint 和 Stylelint，避免多个工具并发写入。

Prettier 负责排版，Stylelint 负责样式语法、有效性和团队规则，两者职责不同。
