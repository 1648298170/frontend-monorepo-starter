# @repo/design-tokens

React 与 Vue UI 包共享的框架无关设计令牌。

```txt
src/
  foundations/
    color.css
    spacing.css
    radius.css
    typography.css
  index.css
```

- foundation 按令牌类别拆分，避免单个 CSS 文件持续膨胀。
- `index.css` 只负责聚合，是默认稳定入口。
- 可以按需导入单类令牌，但 UI 包默认使用完整入口。
- 这里只维护基础变量，不放置组件样式或业务样式。
- 本包定义的变量必须使用 `--repo-*`；应用私有变量不受该命名限制。

```css
@import "@repo/design-tokens/tokens.css";
@import "@repo/design-tokens/color.css";
```
