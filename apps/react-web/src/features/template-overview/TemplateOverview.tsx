import { useMemoizedFn } from "ahooks";
import startCase from "lodash/startCase";

import { MetricCard } from "@repo/react-ui";
import { formatDate, formatPercent } from "@repo/utils";

// 导入应用级运行时配置 Hook，示例业务组件只读取已经装配好的稳定配置。
import { useRuntimeConfig } from "@/hooks/useRuntimeConfig";
import classes from "./TemplateOverview.module.scss";

const metrics = [
  {
    label: "Template",
    value: "React 19",
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
];

export function TemplateOverview() {
  const { config } = useRuntimeConfig();
  // ahooks 适合沉淀 React 业务 Hook 能力；这里用稳定函数包装 lodash 文案格式化示例。
  const formatMetricLabel = useMemoizedFn((label: string) => startCase(label));

  return (
    <main className={classes.root}>
      <section className={classes.header}>
        <p className={classes.eyebrow}>{config.appName}</p>
        <h1 className={classes.title}>React business app template</h1>
        <p className={classes.description}>
          Thin app layer with shared packages for request, config, utilities,
          and React UI.
        </p>
      </section>

      <section className={classes.metrics} aria-label="Template capabilities">
        {metrics.map((metric) => (
          <MetricCard
            key={metric.label}
            label={formatMetricLabel(metric.label)}
            value={metric.value}
            tone={metric.tone}
          />
        ))}
      </section>
    </main>
  );
}
