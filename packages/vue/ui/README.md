# @repo/vue-ui

Vue 业务基础组件包，使用 Vue 3、Composition API、`<script setup>` 和
TypeScript。

## 目录约定

```txt
src/
  components/
    metric-card/
      MetricCard.vue
      metric-card.types.ts
      index.ts
    index.ts
  styles/
    index.css
  index.ts
```

- 每个组件使用独立目录，类型、样式和实现就近维护。
- Vue 组件样式保留在 SFC 内并使用 `scoped`。
- `styles/index.css` 提供 UI 包内跨组件复用的基础样式。
- 公共视觉变量由 `@repo/design-tokens` 提供，避免两套框架重复维护。
- 组件目录的 `index.ts` 定义该组件的 public interface。
- `components/index.ts` 负责组件聚合，根 `index.ts` 是包总入口。
- 禁止业务项目直接导入 `src` 内部路径。

## 使用方式

通过包总入口导入：

```vue
<script setup lang="ts">
import { MetricCard } from "@repo/vue-ui";
</script>
```

也可以通过稳定的组件入口导入：

```ts
import { MetricCard } from "@repo/vue-ui/metric-card";
```

组件会自动加载所需公共样式。应用也可以通过稳定入口显式加载：

```ts
import "@repo/vue-ui/styles.css";
```

`VueMetricCard` 作为兼容别名暂时保留，新代码统一使用 `MetricCard`。

新增组件时复制 `components/metric-card` 的目录组织方式，并在
`components/index.ts` 和 `package.json` 的 `exports` 中登记。
