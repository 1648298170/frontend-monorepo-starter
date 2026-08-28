<script setup lang="ts">
import startCase from "lodash/startCase";
import { computed } from "vue";
import { useTitle } from "@vueuse/core";

import { MetricCard } from "@repo/vue-ui";
import { formatDate, formatPercent } from "@repo/utils";

// 导入应用级运行时配置 Composable，示例业务组件只读取已经装配好的稳定配置。
import { useRuntimeConfig } from "@/composables/useRuntimeConfig";

const { config } = useRuntimeConfig();
// VueUse 适合放置浏览器交互类 Composable；这里用应用名维护页面标题示例。
useTitle(computed(() => `${config.appName} | Vue Template`));

const metrics = computed(() => [
  {
    label: "Template",
    value: "Vue 3",
    tone: "success" as const,
  },
  {
    label: "Today",
    value: formatDate(new Date()),
    tone: "neutral" as const,
  },
  {
    label: "Shared API",
    value: formatPercent(0.96),
    tone: "neutral" as const,
  },
]);

// lodash 用于通用数据和文案处理；这里集中派生展示标签，避免模板里写转换逻辑。
const normalizedMetrics = computed(() =>
  metrics.value.map((metric) => ({
    ...metric,
    label: startCase(metric.label),
  }))
);
</script>

<template>
  <main class="template-overview">
    <section class="template-overview__header">
      <p class="template-overview__eyebrow">
        {{ config.appName }}
      </p>
      <h1 class="template-overview__title">Vue business app template</h1>
      <p class="template-overview__description">
        Thin app layer with shared packages for request, config, utilities, and
        Vue UI.
      </p>
    </section>

    <section
      class="template-overview__metrics"
      aria-label="Template capabilities"
    >
      <MetricCard
        v-for="metric in normalizedMetrics"
        :key="metric.label"
        :label="metric.label"
        :value="metric.value"
        :tone="metric.tone"
      />
    </section>
  </main>
</template>

<style scoped lang="scss">
.template-overview {
  display: grid;
  gap: 1.75rem;
  margin-inline: auto;
  width: min(1040px, calc(100% - 32px));
  padding-block: 4rem;

  &__header {
    display: grid;
    gap: 0.75rem;
  }

  &__eyebrow {
    margin: 0;
    font-size: 0.875rem;
    font-weight: 700;
    color: #065f46;
    text-transform: uppercase;
  }

  &__title {
    margin: 0;
    max-width: 48rem;
    font-size: 2.25rem;
    line-height: 1;
    font-weight: 700;

    @media (width >= 768px) {
      font-size: 3.75rem;
    }
  }

  &__description {
    margin: 0;
    max-width: 42rem;
    font-size: 1.125rem;
    line-height: 1.625;
    color: #475569;
  }

  &__metrics {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 1rem;
  }
}
</style>
