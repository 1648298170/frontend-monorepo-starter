import { MetricCard } from "@repo/react-ui";
import { formatDate, formatPercent } from "@repo/utils";

// 导入应用级运行时配置 Hook。
import { useRuntimeConfig } from "@/hooks/useRuntimeConfig";

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

  return (
    <main className="mx-auto grid w-[min(1040px,calc(100%_-_32px))] gap-7 py-16">
      <section className="grid gap-3">
        <p className="m-0 text-sm font-bold text-emerald-800 uppercase">
          {config.appName}
        </p>
        <h1 className="m-0 max-w-3xl text-4xl leading-none font-bold md:text-6xl">
          React business app template
        </h1>
        <p className="m-0 max-w-2xl text-lg leading-relaxed text-slate-600">
          Thin app layer with shared packages for request, config, utilities,
          and React UI.
        </p>
      </section>

      <section
        className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4"
        aria-label="Template capabilities"
      >
        {metrics.map((metric) => (
          <MetricCard
            key={metric.label}
            label={metric.label}
            value={metric.value}
            tone={metric.tone}
          />
        ))}
      </section>
    </main>
  );
}
