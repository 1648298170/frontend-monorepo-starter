import type { ReactNode } from "react";

export type MetricCardTone = "neutral" | "success";

export interface MetricCardProps {
  label: string;
  value: ReactNode;
  tone?: MetricCardTone;
}
