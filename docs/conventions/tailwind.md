# Tailwind CSS 规范

React 和 Vue 应用统一使用 Tailwind CSS 4，并通过官方
`@tailwindcss/vite` 插件接入 Vite 8。

## 依赖管理

版本在 `pnpm-workspace.yaml` 的 catalog 中统一维护：

```yaml
catalog:
  "@tailwindcss/vite": ^4.3.1
  tailwindcss: ^4.3.1
```

每个使用 Tailwind 的应用仍需在自己的 `devDependencies` 中声明
`catalog:`，保证依赖归属清晰。

## Vite 配置

每个应用在框架插件之后加载 Tailwind：

```ts
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [frameworkPlugin(), tailwindcss()],
});
```

## CSS 入口

应用全局样式入口需要导入 Tailwind：

```css
@import "tailwindcss";
```

该入口必须保持为普通 `.css` 文件。项目虽然支持 Sass，但 Tailwind CSS 4 不进入
Sass 编译管线；应用通过独立的 `main.scss` 承载 Sass 样式。

Tailwind 4 默认使用自动内容检测，当前应用不需要创建
`tailwind.config.js`。只有需要自定义扫描来源、主题插件或兼容第三方库时才增加额外配置。

## 使用边界

- 页面布局和业务 feature 优先使用 Tailwind utility class。
- React/Vue UI 包继续封装自己的组件样式和设计令牌，不要求调用方拼接内部样式。
- 应用级全局 CSS 只保留字体、页面背景、reset 和确实无法由 utility 表达的规则。
- 不使用动态字符串拼接类名，例如 `text-${color}-500`，因为构建阶段无法可靠检测。
- 重复且具有业务语义的样式应提取为组件，不要堆积超长 class 字符串。

## 验证

修改 Tailwind 配置或类名后至少执行：

```bash
pnpm lint
pnpm typecheck
pnpm build
```

生产构建产物中应包含实际使用的 utility CSS，不应包含未使用的完整样式集合。

Tailwind CSS-first 指令由根目录 Stylelint 配置显式允许，样式变更还应执行
`pnpm lint:style`。
