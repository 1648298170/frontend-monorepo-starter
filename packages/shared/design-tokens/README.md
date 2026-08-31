# @repo/design-tokens

React 与 Vue UI 包共享的框架无关设计令牌。

```txt
src/
  foundations/
    color.css
    spacing.css
    radius.css
    size.css
    shadow.css
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

## 令牌来源

`color.css` 与 `typography.css` 的原语层取自 INGOO UI 设计规范
（蓝湖项目「APP」，规范页 A1「基础&功能色」与 A7「输入类」的 CSS 标注原值）。
`spacing.css` / `radius.css` / `size.css` / `shadow.css` 取自规范页
A2「字体排版/圆角/阴影/尺寸/间距」的 token 表原值。

完整规范（A1–A7 组件矩阵、跨页不一致清单、命名映射）见
[`docs/design/ingoo-ui-spec.md`](../../docs/design/ingoo-ui-spec.md)。

## 分层结构

- **原语层**：设计系统的最小令牌（功能色状态、字阶、行高、字重、字体栈），
  新代码一律使用这一层。
- **兼容别名层**：文件末尾的旧占位变量（如 `--repo-ui-color-surface`、
  `--repo-ui-font-size-small`），已重定向到最近的原语值，供外部使用方与
  历史代码引用兜底（仓内组件已全部迁移至原语层）；不要扩展这一层。

透明度源值（如 `#FA6900 50%`）按仓库 stylelint 现代记法写为
`rgb(250 105 0 / 50%)`，数值与设计稿一致；源 token 名保留在注释中溯源。

已知的两处设计稿内部不一致（原值保留，见 `color.css` 文件头注释）：
Small 尺寸禁用色与悬浮文字色的取值差异，实现组件时以注释为准。

## 待补齐

原 spacing/radius 占位值已按 A2 token 表原值替换。仍缺的数据
（设计侧尚未产出或仅存在于底图，不做编造）：

- 暗色模式 token（A1 描述提及但全套规范无暗色分册）
- 动效规范（时长/缓动曲线零定义）
- 组件级圆角对应关系（token 档位齐全，但"卡片/按钮用哪档"需查底图或问设计）
- A7 按钮容器填充/高度、A5 输入框视觉样式（CSS 标注为零，仅存在于底图）
