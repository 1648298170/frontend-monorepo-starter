<script setup lang="ts">
import type { MetricCardProps } from "./metric-card.types";

// 导入 UI 包公共表面样式，组件内部只维护自身布局和状态样式。
import "../../styles/index.css";

withDefaults(defineProps<MetricCardProps>(), {
  tone: "neutral",
});
</script>

<template>
  <article class="repo-ui-surface repo-metric-card" :data-tone="tone">
    <span class="repo-metric-card__label">{{ label }}</span>
    <strong class="repo-metric-card__value">{{ value }}</strong>
  </article>
</template>

<style scoped>
.repo-metric-card {
  display: grid;
  gap: var(--repo-ui-spacing-tight);
  padding: var(--repo-ui-spacing-base);
}

.repo-metric-card[data-tone="success"] {
  border-color: var(--repo-ui-color-success-light-active);
  background: var(--repo-ui-color-success-light);
}

.repo-metric-card__label {
  color: var(--repo-ui-color-text-2);
  font-size: var(--repo-ui-font-size-2);
}

.repo-metric-card__value {
  color: var(--repo-ui-color-text-1);
  font-size: var(--repo-ui-font-size-5);
  line-height: 1.2;
}
</style>
