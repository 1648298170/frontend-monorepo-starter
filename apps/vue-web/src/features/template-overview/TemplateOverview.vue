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
  <main class="mx-auto grid w-[min(1040px,calc(100%_-_32px))] gap-7 py-16">
    <section class="grid gap-3">
      <p class="m-0 text-sm font-bold text-emerald-800 uppercase">
        {{ config.appName }}
      </p>
      <h1 class="m-0 max-w-3xl text-4xl leading-none font-bold md:text-6xl">
        Vue business app template
      </h1>
      <p class="m-0 max-w-2xl text-lg leading-relaxed text-slate-600">
        Thin app layer with shared packages for request, config, utilities, and
        Vue UI.
      </p>
    </section>

    <section
      class="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4"
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
