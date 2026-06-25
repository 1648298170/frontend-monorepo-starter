# Sass 编译规范

React 和 Vue 应用通过 Vite 8 内置的 CSS 预处理器能力编译 Sass，编译器使用
`sass-embedded`。

## 依赖管理

版本在 pnpm catalog 中统一维护：

```yaml
catalog:
  sass-embedded: ^1.100.0
```

每个需要编译 Sass 的应用在自己的 `devDependencies` 中声明：

```json
{
  "sass-embedded": "catalog:"
}
```

不需要额外创建 `sass.config.js`。Vite 会自动处理 `.scss`、`.sass` 以及 Vue SFC
中的 `<style lang="scss">`。

应用的 `vite.config.ts` 统一注入：

```scss
@use "@/styles/abstracts/index.scss" as *;
```

因此 Vue 的 `<style lang="scss">`、React 的 `.module.scss` 和应用 Sass 文件都可以
直接使用 `abstracts` 公开的变量、函数与 mixin，无需重复 `@use`。

## 与 Tailwind CSS 的边界

Tailwind CSS 4 和 Sass 使用独立入口：

```ts
import "./styles/tailwind.css";
import "./styles/main.scss";
```

- `tailwind.css` 只包含 `@import "tailwindcss"`，由 Tailwind Vite 插件处理。
- `main.scss` 存放 Sass 变量、mixin、函数、嵌套和应用级全局样式。
- 不要在 `.scss` 中导入 Tailwind CSS，也不要让 Sass 处理 Tailwind 指令。

这种分离可以避免 Sass 的 `@import` 语义与 Tailwind CSS 4 的 CSS-first
处理模型冲突。

## 文件组织

应用样式建议：

```txt
src/styles/
  tailwind.css
  main.scss
  abstracts/
    _variables.scss
    index.scss
  components/
  pages/
```

`abstracts/index.scss` 使用 `@forward` 公开 Sass 能力。新增 `_mixins.scss` 或
`_functions.scss` 后，需要在该入口中显式转发。

组件局部样式：

```vue
<style scoped lang="scss">
.panel {
  &__title {
    font-weight: 700;
  }
}
</style>
```

React 组件需要局部隔离时，优先使用 `Component.module.scss`。

## 使用原则

- 页面布局与常见视觉属性优先使用 Tailwind utility。
- Sass 用于复杂选择器、mixin、计算和第三方样式覆盖。
- 设计颜色和间距应来自 `@repo/design-tokens`，避免在 Sass 中再维护一套品牌令牌。
- 不滥用深层嵌套，选择器嵌套建议不超过三层。
- Sass 文件纳入 Prettier、Stylelint 和 lint-staged 检查。
