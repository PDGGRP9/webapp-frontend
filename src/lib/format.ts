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

export function timeAgo(value: string | null | undefined): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const seconds = Math.max(0, Math.round((Date.now() - date.getTime()) / 1000));
  if (seconds < 60) return `il y a ${seconds} s`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `il y a ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `il y a ${hours} h`;
  const days = Math.round(hours / 24);
  return `il y a ${days} j`;
}

export function headerDate(date: Date = new Date()): string {
  const day = date.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
  const time = date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  return `${day.charAt(0).toUpperCase()}${day.slice(1)} · ${time}`;
}

export function initials(...parts: (string | null | undefined)[]): string {
  const letters = parts
    .filter((part): part is string => Boolean(part && part.trim()))
    .map((part) => part.trim()[0]!.toUpperCase());
  return letters.slice(0, 2).join("") || "?";
}
