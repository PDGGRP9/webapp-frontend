import { describe, expect, it } from "vitest";
import type { Measurement } from "../api/types";
import { zurichMidnightMs } from "./format";
import {
  dailyStepTotals,
  dailyTotals,
  filterByRange,
  hourlyStepDeltas,
  latestMeasurement,
  mostRecent,
  movingAverage,
  sortAscendingByCapturedAt,
  sortDescendingByCapturedAt,
  splitByGap,
} from "./measurements";

const HOUR_MS = 60 * 60 * 1000;

function makeMeasurement(id: number, capturedAt: string): Measurement {
  return {
    id,
    captured_at: capturedAt,
    heart_rate_bpm: 70,
    spo2_percent: 98,
    step_count: 100,
    motion_level: 0.1,
    signal_quality: 90,
    raw_payload: {},
    source_topic: null,
    received_at: capturedAt,
    created_at: capturedAt,
    bracelet: { device_uid: "uid", serial_number: "serial", display_name: "Bracelet" },
  };
}

// The backend returns measurements newest-first (ORDER BY captured_at DESC). The
// stats chart used to plot that array as-is, so the time series read backwards
// (newest on the left). These tests pin the fix: chart data must always be
// re-sorted oldest-first before it's plotted.
describe("sortAscendingByCapturedAt", () => {
  it("orders oldest first regardless of input order", () => {
    const newestFirst = [
      makeMeasurement(3, "2026-01-03T00:00:00Z"),
      makeMeasurement(1, "2026-01-01T00:00:00Z"),
      makeMeasurement(2, "2026-01-02T00:00:00Z"),
    ];

    const result = sortAscendingByCapturedAt(newestFirst);

    expect(result.map((m) => m.id)).toEqual([1, 2, 3]);
  });

  it("does not mutate the input array", () => {
    const records = [makeMeasurement(2, "2026-01-02T00:00:00Z"), makeMeasurement(1, "2026-01-01T00:00:00Z")];
    sortAscendingByCapturedAt(records);
    expect(records.map((m) => m.id)).toEqual([2, 1]);
  });
});

describe("sortDescendingByCapturedAt", () => {
  it("orders newest first regardless of input order", () => {
    const unordered = [
      makeMeasurement(1, "2026-01-01T00:00:00Z"),
      makeMeasurement(3, "2026-01-03T00:00:00Z"),
      makeMeasurement(2, "2026-01-02T00:00:00Z"),
    ];

    expect(sortDescendingByCapturedAt(unordered).map((m) => m.id)).toEqual([3, 2, 1]);
  });
});

describe("latestMeasurement", () => {
  it("returns the most recent record even if the input is unsorted", () => {
    const unordered = [
      makeMeasurement(1, "2026-01-01T00:00:00Z"),
      makeMeasurement(3, "2026-01-03T00:00:00Z"),
      makeMeasurement(2, "2026-01-02T00:00:00Z"),
    ];

    expect(latestMeasurement(unordered)?.id).toBe(3);
  });

  it("returns null for an empty list", () => {
    expect(latestMeasurement([])).toBeNull();
  });
});

describe("mostRecent", () => {
  it("returns the N newest records, newest first", () => {
    const unordered = [
      makeMeasurement(1, "2026-01-01T00:00:00Z"),
      makeMeasurement(4, "2026-01-04T00:00:00Z"),
      makeMeasurement(2, "2026-01-02T00:00:00Z"),
      makeMeasurement(3, "2026-01-03T00:00:00Z"),
    ];

    expect(mostRecent(unordered, 2).map((m) => m.id)).toEqual([4, 3]);
  });
});

describe("splitByGap", () => {
  it("keeps a single run when points are within the gap threshold", () => {
    const points = [
      { x: "2026-01-01T00:00:00Z", y: 1 },
      { x: "2026-01-01T00:10:00Z", y: 2 },
      { x: "2026-01-01T00:20:00Z", y: 3 },
    ];

    expect(splitByGap(points, 15 * 60 * 1000)).toEqual([points]);
  });

  it("starts a new segment once a gap exceeds the threshold", () => {
    const points = [
      { x: "2026-01-01T00:00:00Z", y: 1 },
      { x: "2026-01-01T00:10:00Z", y: 2 },
      { x: "2026-01-01T04:00:00Z", y: 3 }, // ~3h50 gap
      { x: "2026-01-01T04:10:00Z", y: 4 },
    ];

    const segments = splitByGap(points, 60 * 60 * 1000);

    expect(segments.map((segment) => segment.map((p) => p.y))).toEqual([
      [1, 2],
      [3, 4],
    ]);
  });

  it("returns an empty array for no points", () => {
    expect(splitByGap([], 1000)).toEqual([]);
  });
});

describe("dailyTotals", () => {
  it("takes the highest value seen on each day, one entry per day", () => {
    const records = [
      { ...makeMeasurement(1, "2026-01-01T08:00:00Z"), step_count: 500 },
      { ...makeMeasurement(2, "2026-01-01T20:00:00Z"), step_count: 4000 },
      { ...makeMeasurement(3, "2026-01-02T06:00:00Z"), step_count: 200 }, // resets on the new day
      { ...makeMeasurement(4, "2026-01-02T22:00:00Z"), step_count: 6000 },
    ];

    expect(dailyTotals(records, "step_count").sort((a, b) => a - b)).toEqual([4000, 6000]);
  });

  it("returns an empty array for no records", () => {
    expect(dailyTotals([], "step_count")).toEqual([]);
  });

  it("resets at local midnight, not UTC midnight", () => {
    // In CEST (UTC+2), 22:00Z is already the next local day.
    const records = [
      { ...makeMeasurement(1, "2026-01-01T21:00:00Z"), step_count: 4000 }, // 23:00 local, still Jan 1
      { ...makeMeasurement(2, "2026-01-01T22:30:00Z"), step_count: 100 }, // 00:30 local, already Jan 2
      { ...makeMeasurement(3, "2026-01-02T05:00:00Z"), step_count: 300 }, // 07:00 local, Jan 2
    ];

    expect(dailyTotals(records, "step_count").sort((a, b) => a - b)).toEqual([300, 4000]);
  });
});

describe("filterByRange", () => {
  it("keeps only records within the given window", () => {
    const now = Date.now();
    const records = [
      makeMeasurement(1, new Date(now - 2 * 60 * 60 * 1000).toISOString()), // 2h ago
      makeMeasurement(2, new Date(now - 10 * 24 * 60 * 60 * 1000).toISOString()), // 10d ago
    ];

    const result = filterByRange(records, "24h");

    expect(result.map((m) => m.id)).toEqual([1]);
  });
});

describe("hourlyStepDeltas", () => {
  it("returns 24 hourly buckets of steps *taken that hour*, resetting the baseline at local midnight", () => {
    const aug28Midnight = zurichMidnightMs(2026, 8, 28);
    const aug29Midnight = zurichMidnightMs(2026, 8, 29);
    const nowMs = aug29Midnight + 10 * HOUR_MS; // 10:00 local on Aug 29

    const records = [
      // Last reading of Aug 28, at 23:00 local — day total 8000 before the midnight reset.
      { ...makeMeasurement(1, new Date(aug28Midnight + 23 * HOUR_MS).toISOString()), step_count: 8000 },
      // Aug 29 starts counting from 0 again.
      { ...makeMeasurement(2, new Date(aug29Midnight + 30 * 60 * 1000).toISOString()), step_count: 50 },
      { ...makeMeasurement(3, new Date(aug29Midnight + 6 * HOUR_MS).toISOString()), step_count: 1200 },
      // No steps between 09:00 and 09:30 — same cumulative value as the previous reading.
      { ...makeMeasurement(4, new Date(aug29Midnight + 9 * HOUR_MS + 30 * 60 * 1000).toISOString()), step_count: 1200 },
    ];

    const buckets = hourlyStepDeltas(records, nowMs);

    expect(buckets).toHaveLength(24);
    expect(buckets[0].x).toBe(new Date(aug28Midnight + 11 * HOUR_MS).toISOString());
    expect(buckets[23].x).toBe(new Date(nowMs).toISOString());

    const expectedDeltas = new Array(24).fill(0);
    expectedDeltas[12] = 8000; // Aug 28, 23:00 — jump from 0 to 8000 within the pre-midnight hour
    expectedDeltas[13] = 50; // Aug 29, 00:00 — counter reset to 0, then 50 steps
    expectedDeltas[19] = 1150; // Aug 29, 06:00 — 1200 - 50
    // index 22 (09:00) stays 0: the 09:30 reading repeats the 06:00 value, no new steps.
    expect(buckets.map((bucket) => bucket.y)).toEqual(expectedDeltas);
  });

  it("fills hours with no measurement as 0 instead of omitting them", () => {
    const nowMs = zurichMidnightMs(2026, 8, 29) + 10 * HOUR_MS;
    expect(hourlyStepDeltas([], nowMs).every((bucket) => bucket.y === 0)).toBe(true);
  });
});

describe("dailyStepTotals", () => {
  it("returns one bucket per day, zero-filling days with no data", () => {
    const aug27Midnight = zurichMidnightMs(2026, 8, 27);
    const aug28Midnight = zurichMidnightMs(2026, 8, 28);
    const aug29Midnight = zurichMidnightMs(2026, 8, 29);
    const nowMs = aug29Midnight + 5 * HOUR_MS;

    const records = [
      { ...makeMeasurement(1, new Date(aug27Midnight + 8 * HOUR_MS).toISOString()), step_count: 500 },
      { ...makeMeasurement(2, new Date(aug27Midnight + 20 * HOUR_MS).toISOString()), step_count: 4000 },
      // Aug 28 has no measurements at all.
      { ...makeMeasurement(3, new Date(aug29Midnight + 3 * HOUR_MS).toISOString()), step_count: 600 },
    ];

    const buckets = dailyStepTotals(records, 3, nowMs);

    expect(buckets).toEqual([
      { x: new Date(aug27Midnight).toISOString(), y: 4000 },
      { x: new Date(aug28Midnight).toISOString(), y: 0 },
      { x: new Date(aug29Midnight).toISOString(), y: 600 },
    ]);
  });
});

describe("movingAverage", () => {
  const MINUTE_MS = 60 * 1000;
  const base = Date.parse("2026-01-01T12:00:00Z");
  const at = (offsetMin: number, hr: number): Measurement => ({
    ...makeMeasurement(offsetMin, new Date(base + offsetMin * MINUTE_MS).toISOString()),
    heart_rate_bpm: hr,
  });

  it("averages every raw sample inside the window, not just the endpoints", () => {
    // Five samples one minute apart within a single 30-min window: mean = 470/5 = 94.
    // Connecting only the first (60) and last (140) sample would never yield 94.
    const records = [at(0, 60), at(1, 90), at(2, 90), at(3, 90), at(4, 140)];
    const series = movingAverage(records, "heart_rate_bpm", 30 * MINUTE_MS, 5 * MINUTE_MS);
    expect(series.length).toBeGreaterThan(0);
    // Every emitted point is the mean of all 5 samples = 94, never 60 or 140.
    for (const point of series) expect(point.y).toBeCloseTo(94, 5);
  });

  it("stays a dense curve (many points) even from a short burst", () => {
    // A 6-minute burst of data -> bucketAverage(15min) would give 1 point; movingAverage
    // resamples every 5 min across the burst + trailing step.
    const records = [at(0, 70), at(2, 72), at(4, 74), at(6, 76)];
    const series = movingAverage(records, "heart_rate_bpm", 30 * MINUTE_MS, 5 * MINUTE_MS);
    expect(series.length).toBeGreaterThanOrEqual(2);
  });

  it("emits nothing across a gap wider than the window, so splitByGap can break the line", () => {
    const records = [at(0, 70), at(2, 70), at(120, 90), at(122, 90)];
    const series = movingAverage(records, "heart_rate_bpm", 30 * MINUTE_MS, 5 * MINUTE_MS);
    const gaps = series
      .slice(1)
      .map((point, index) => Date.parse(point.x) - Date.parse(series[index].x));
    // At least one step-to-step jump far bigger than the 5-min cadence (the empty gap).
    expect(Math.max(...gaps)).toBeGreaterThan(30 * MINUTE_MS);
  });

  it("returns [] for no finite samples", () => {
    expect(movingAverage([], "heart_rate_bpm", 30 * MINUTE_MS, 5 * MINUTE_MS)).toEqual([]);
  });
});
