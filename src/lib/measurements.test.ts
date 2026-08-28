import { describe, expect, it } from "vitest";
import type { Measurement } from "../api/types";
import {
  dailyTotals,
  filterByRange,
  latestMeasurement,
  mostRecent,
  sortAscendingByCapturedAt,
  sortDescendingByCapturedAt,
  splitByGap,
} from "./measurements";

function makeMeasurement(id: number, capturedAt: string): Measurement {
  return {
    id,
    bracelet_id: 1,
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
