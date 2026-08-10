import type { MetricKey } from "../api/types";

export function formatDate(value: string | null | undefined): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "medium" });
}

export function formatNumber(value: number | null | undefined, suffix = ""): string {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "-";
  const numeric = Number(value);
  return `${numeric.toFixed(numeric % 1 === 0 ? 0 : 1)}${suffix}`;
}

const METRIC_LABELS: Record<MetricKey, string> = {
  heart_rate_bpm: "Fréquence cardiaque",
  spo2_percent: "SpO2",
  step_count: "Pas cumulés",
  signal_quality: "Qualité signal",
};

const METRIC_SUFFIXES: Record<MetricKey, string> = {
  heart_rate_bpm: " bpm",
  spo2_percent: " %",
  step_count: "",
  signal_quality: " %",
};

export function metricLabel(metric: MetricKey): string {
  return METRIC_LABELS[metric];
}

export function metricSuffix(metric: MetricKey): string {
  return METRIC_SUFFIXES[metric];
}
