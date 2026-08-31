import type { Measurement, MetricKey, RangeKey } from "../api/types";
import { zurichDayKey, zurichMidnightMs } from "./format";

const HOUR_MS = 60 * 60 * 1000;

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
  key: "heart_rate_bpm" | "spo2_percent" | "step_count",
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
 * value seen on each calendar day in APP_TIME_ZONE — i.e. that day's running total — one
 * entry per day present.
 */
export function dailyTotals(records: Measurement[], key: MetricKey): number[] {
  const byDay = new Map<string, number>();
  for (const record of records) {
    const value = Number(record[key]);
    if (!Number.isFinite(value)) continue;
    const day = zurichDayKey(new Date(record.captured_at).getTime());
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

/**
 * step_count is a running total that resets to 0 at local midnight (see `dailyTotals`), so
 * "steps taken this hour" is the *increase* of that counter within the hour, not the counter
 * itself. Returns exactly 24 hourly buckets ending at the hour containing `nowMs`, oldest
 * first — hours with no measurement (or no walking) come back as 0 rather than being omitted,
 * so the bar chart always renders a full 24 bars.
 */
export function hourlyStepDeltas(records: Measurement[], nowMs: number = Date.now()): { x: string; y: number }[] {
  const ascending = sortAscendingByCapturedAt(records);
  const lastBucketStart = Math.floor(nowMs / HOUR_MS) * HOUR_MS;
  const firstBucketStart = lastBucketStart - 23 * HOUR_MS;

  let currentDayKey = zurichDayKey(firstBucketStart);
  // Seed the running counter from the last known reading on the same local day, so the
  // very first bucket's delta isn't computed against a false "day just started" baseline.
  let baseline = 0;
  const priorSameDay = ascending
    .filter((record) => {
      const t = new Date(record.captured_at).getTime();
      return t < firstBucketStart && zurichDayKey(t) === currentDayKey;
    })
    .at(-1);
  if (priorSameDay) {
    const value = Number(priorSameDay.step_count);
    if (Number.isFinite(value)) baseline = value;
  }

  const buckets: { x: string; y: number }[] = [];
  for (let bucketStart = firstBucketStart; bucketStart <= lastBucketStart; bucketStart += HOUR_MS) {
    const bucketEnd = bucketStart + HOUR_MS;
    const dayKey = zurichDayKey(bucketStart);
    if (dayKey !== currentDayKey) {
      currentDayKey = dayKey;
      baseline = 0;
    }

    const values = ascending
      .filter((record) => {
        const t = new Date(record.captured_at).getTime();
        return t >= bucketStart && t < bucketEnd;
      })
      .map((record) => Number(record.step_count))
      .filter((value) => Number.isFinite(value));

    let delta = 0;
    if (values.length) {
      const bucketEndValue = Math.max(...values);
      delta = Math.max(0, bucketEndValue - baseline);
      baseline = bucketEndValue;
    }
    buckets.push({ x: new Date(bucketStart).toISOString(), y: delta });
  }
  return buckets;
}

/**
 * One bar per calendar day (APP_TIME_ZONE) for the last `days` days ending today, oldest
 * first. Since step_count resets to 0 at local midnight, a day's total is simply the highest
 * reading seen that day (see `dailyTotals`) — days with no data come back as 0.
 */
export function dailyStepTotals(
  records: Measurement[],
  days: number,
  nowMs: number = Date.now(),
): { x: string; y: number }[] {
  const byDay = new Map<string, number>();
  for (const record of records) {
    const value = Number(record.step_count);
    if (!Number.isFinite(value)) continue;
    const day = zurichDayKey(new Date(record.captured_at).getTime());
    const current = byDay.get(day);
    if (current === undefined || value > current) byDay.set(day, value);
  }

  const todayKey = zurichDayKey(nowMs);
  const [todayYear, todayMonth, todayDay] = todayKey.split("-").map(Number);

  const buckets: { x: string; y: number }[] = [];
  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const calendarDay = new Date(Date.UTC(todayYear, todayMonth - 1, todayDay - offset));
    const dayStartMs = zurichMidnightMs(
      calendarDay.getUTCFullYear(),
      calendarDay.getUTCMonth() + 1,
      calendarDay.getUTCDate(),
    );
    const key = zurichDayKey(dayStartMs);
    buckets.push({ x: new Date(dayStartMs).toISOString(), y: byDay.get(key) ?? 0 });
  }
  return buckets;
}
