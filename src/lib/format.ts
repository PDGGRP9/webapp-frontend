import type { MetricKey } from "../api/types";

/**
 * The bracelet fleet and its demo data are all pinned to Switzerland (see the backend seed data
 * and fake-emitter, which both bucket step_count by Europe/Zurich local days) — so the app shows
 * every timestamp in that zone rather than the browser's own system zone. A browser/device left
 * on UTC (or any other zone) would otherwise disagree with the server about where a day starts,
 * desyncing the step-count reset from the chart's day-boundary marker.
 */
export const APP_TIME_ZONE = "Europe/Zurich";

const zurichDatePartsFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: APP_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const zurichInstantFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: APP_TIME_ZONE,
  hourCycle: "h23",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

function partsToRecord(parts: Intl.DateTimeFormatPart[]): Record<string, string> {
  return Object.fromEntries(parts.map((part) => [part.type, part.value]));
}

/** "YYYY-MM-DD" calendar date of `ms` in APP_TIME_ZONE, regardless of the browser's own zone. */
export function zurichDayKey(ms: number): string {
  const { year, month, day } = partsToRecord(zurichDatePartsFormatter.formatToParts(new Date(ms)));
  return `${year}-${month}-${day}`;
}

/** The UTC instant (ms) of local midnight in APP_TIME_ZONE for the given calendar date. */
export function zurichMidnightMs(year: number, month: number, day: number): number {
  const guess = Date.UTC(year, month - 1, day, 0, 0, 0);
  const { year: y, month: m, day: d, hour, minute, second } = partsToRecord(
    zurichInstantFormatter.formatToParts(new Date(guess)),
  );
  const asIfUtc = Date.UTC(Number(y), Number(m) - 1, Number(d), Number(hour), Number(minute), Number(second));
  return guess - (asIfUtc - guess);
}

/** First APP_TIME_ZONE midnight strictly after `ms`. */
export function nextZurichMidnightAfter(ms: number): number {
  const { year, month, day } = partsToRecord(zurichDatePartsFormatter.formatToParts(new Date(ms)));
  return zurichMidnightMs(Number(year), Number(month), Number(day) + 1);
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "medium", timeZone: APP_TIME_ZONE });
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
};

const METRIC_SUFFIXES: Record<MetricKey, string> = {
  heart_rate_bpm: " bpm",
  spo2_percent: " %",
  step_count: "",
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
  const day = date.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: APP_TIME_ZONE });
  const time = date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: APP_TIME_ZONE });
  return `${day.charAt(0).toUpperCase()}${day.slice(1)} · ${time}`;
}

export function initials(...parts: (string | null | undefined)[]): string {
  const letters = parts
    .filter((part): part is string => Boolean(part && part.trim()))
    .map((part) => part.trim()[0]!.toUpperCase());
  return letters.slice(0, 2).join("") || "?";
}
