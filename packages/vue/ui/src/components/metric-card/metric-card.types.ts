export type MetricCardTone = "neutral" | "success";

export interface MetricCardProps {
  label: string;
  value: string;
  tone?: MetricCardTone;
}
