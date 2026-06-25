# @repo/react-ui

React 业务基础组件包。

## 目录约定

```txt
src/
  components/
    metric-card/
      MetricCard.tsx
      metric-card.types.ts
      metric-card.css
      index.ts
    index.ts
  styles/
    index.css
  index.ts
```

- 每个组件使用独立目录，类型、样式和实现就近维护。
- `styles/index.css` 提供 UI 包内跨组件复用的基础样式。
- 组件目录的 `index.ts` 定义该组件的 public interface。
- `components/index.ts` 负责组件聚合，根 `index.ts` 是包总入口。
- 公共视觉变量由 `@repo/design-tokens` 提供，避免两套框架重复维护。
- 禁止业务项目直接导入 `src` 内部路径。

## 使用方式

通过包总入口导入：

```tsx
import { MetricCard } from "@repo/react-ui";
```

也可以通过稳定的组件入口导入：

```tsx
import { MetricCard } from "@repo/react-ui/metric-card";
```

组件会自动加载所需公共样式。应用也可以通过稳定入口显式加载：

```ts
import "@repo/react-ui/styles.css";
```

新增组件时复制 `components/metric-card` 的目录组织方式，并在
`components/index.ts` 和 `package.json` 的 `exports` 中登记。
