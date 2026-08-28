import type { Measurement, MetricKey, RangeKey } from "../api/types";

/**
 * The backend returns measurements newest-first. Anything that plots or walks
 * a time series (charts, x-axis labels) needs them oldest-first, or the
 * series reads backwards.
 */
export function sortAscendingByCapturedAt(records: Measurement[]): Measurement[] {
  return [...records].sort(
    (left, right) => new Date(left.captured_at).getTime() - new Date(right.captured_at).getTime(),
  );
}

export function sortDescendingByCapturedAt(records: Measurement[]): Measurement[] {
  return [...records].sort(
    (left, right) => new Date(right.captured_at).getTime() - new Date(left.captured_at).getTime(),
  );
}

export function latestMeasurement(records: Measurement[]): Measurement | null {
  return sortDescendingByCapturedAt(records).at(0) ?? null;
}

export function mostRecent(records: Measurement[], count: number): Measurement[] {
  return sortDescendingByCapturedAt(records).slice(0, count);
}

const RANGE_HOURS: Record<RangeKey, number> = {
  "24h": 24,
  "7d": 24 * 7,
};

export function filterByRange(records: Measurement[], range: RangeKey): Measurement[] {
  const thresholdMs = Date.now() - RANGE_HOURS[range] * 60 * 60 * 1000;
  return records.filter((record) => new Date(record.captured_at).getTime() >= thresholdMs);
}

export function metricStats(
  records: Measurement[],
  key: "heart_rate_bpm" | "spo2_percent" | "step_count" | "signal_quality",
): { min: number | null; avg: number | null; max: number | null } {
  const values = records.map((record) => Number(record[key])).filter((value) => Number.isFinite(value));
  if (!values.length) return { min: null, avg: null, max: null };
  return {
    min: Math.min(...values),
    avg: values.reduce((sum, value) => sum + value, 0) / values.length,
    max: Math.max(...values),
  };
}

/**
 * Splits an ascending series into contiguous runs, starting a new run whenever the
 * gap to the previous point exceeds `gapMs`. Used to draw chart lines with real
 * holes instead of bridging silently across periods with no measurements.
 */
export function splitByGap<T extends { x: string }>(points: T[], gapMs: number): T[][] {
  if (points.length === 0) return [];
  const segments: T[][] = [[points[0]]];
  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1];
    const current = points[index];
    const delta = new Date(current.x).getTime() - new Date(previous.x).getTime();
    if (delta > gapMs) segments.push([current]);
    else segments[segments.length - 1].push(current);
  }
  return segments;
}

/**
 * For a counter that resets every calendar day (e.g. step_count), returns the highest
 * value seen on each UTC day — i.e. that day's running total — one entry per day present.
 */
export function dailyTotals(records: Measurement[], key: MetricKey): number[] {
  const byDay = new Map<string, number>();
  for (const record of records) {
    const value = Number(record[key]);
    if (!Number.isFinite(value)) continue;
    const day = record.captured_at.slice(0, 10);
    const current = byDay.get(day);
    if (current === undefined || value > current) byDay.set(day, value);
  }
  return [...byDay.values()];
}

/** Buckets records into fixed-size time windows and averages `key` within each — oldest first. */
export function bucketAverage(
  records: Measurement[],
  key: MetricKey,
  bucketMs: number,
): { x: string; y: number }[] {
  const buckets = new Map<number, number[]>();
  for (const record of records) {
    const value = Number(record[key]);
    if (!Number.isFinite(value)) continue;
    const bucketStart = Math.floor(new Date(record.captured_at).getTime() / bucketMs) * bucketMs;
    const bucket = buckets.get(bucketStart);
    if (bucket) bucket.push(value);
    else buckets.set(bucketStart, [value]);
  }
  return [...buckets.entries()]
    .sort(([left], [right]) => left - right)
    .map(([start, values]) => ({
      x: new Date(start).toISOString(),
      y: values.reduce((sum, value) => sum + value, 0) / values.length,
    }));
}
