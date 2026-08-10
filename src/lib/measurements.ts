import type { Measurement, RangeKey } from "../api/types";

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
  "30d": 24 * 30,
};

export function filterByRange(records: Measurement[], range: RangeKey): Measurement[] {
  const thresholdMs = Date.now() - RANGE_HOURS[range] * 60 * 60 * 1000;
  return records.filter((record) => new Date(record.captured_at).getTime() >= thresholdMs);
}
