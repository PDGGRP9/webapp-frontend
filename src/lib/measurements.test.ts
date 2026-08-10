import { describe, expect, it } from "vitest";
import type { Measurement } from "../api/types";
import {
  filterByRange,
  latestMeasurement,
  mostRecent,
  sortAscendingByCapturedAt,
  sortDescendingByCapturedAt,
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
