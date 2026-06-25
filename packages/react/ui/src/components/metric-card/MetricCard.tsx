import type { MetricCardProps } from "./metric-card.types";

// 导入 UI 包公共表面样式，再叠加当前组件自己的布局样式。
import "../../styles/index.css";
import "./metric-card.css";

export function MetricCard({
  label,
  value,
  tone = "neutral",
}: MetricCardProps) {
  return (
    <article className="repo-ui-surface repo-metric-card" data-tone={tone}>
      <span className="repo-metric-card__label">{label}</span>
      <strong className="repo-metric-card__value">{value}</strong>
    </article>
  );
}
