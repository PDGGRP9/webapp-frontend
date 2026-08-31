import { describe, expect, it } from "vitest";
import { formatNumber, metricSuffix, nextZurichMidnightAfter, zurichDayKey, zurichMidnightMs } from "./format";

describe("formatNumber", () => {
  it("returns a dash for null/undefined/NaN", () => {
    expect(formatNumber(null)).toBe("-");
    expect(formatNumber(undefined)).toBe("-");
    expect(formatNumber(Number.NaN)).toBe("-");
  });

  it("keeps integers whole and rounds decimals to one place", () => {
    expect(formatNumber(72)).toBe("72");
    expect(formatNumber(97.456, " %")).toBe("97.5 %");
  });
});

describe("metricSuffix", () => {
  it("gives each metric its display suffix", () => {
    expect(metricSuffix("spo2_percent")).toBe(" %");
    expect(metricSuffix("heart_rate_bpm")).toBe(" bpm");
    expect(metricSuffix("step_count")).toBe("");
  });
});

// These deliberately build every expectation from Date.UTC + explicit offsets rather than
// relying on the local Date getters, so the test itself stays correct no matter what timezone
// the machine running it is in — the whole point of these helpers is to NOT depend on that.
describe("zurichMidnightMs", () => {
  it("returns local midnight during CEST (UTC+2, summer)", () => {
    expect(zurichMidnightMs(2026, 8, 29)).toBe(Date.UTC(2026, 7, 28, 22, 0, 0));
  });

  it("returns local midnight during CET (UTC+1, winter)", () => {
    expect(zurichMidnightMs(2026, 1, 15)).toBe(Date.UTC(2026, 0, 14, 23, 0, 0));
  });
});

describe("zurichDayKey", () => {
  it("stays on the previous Zurich day just before local midnight", () => {
    expect(zurichDayKey(Date.UTC(2026, 7, 28, 21, 59, 0))).toBe("2026-08-28");
  });

  it("rolls to the next Zurich day right at local midnight, even though it's still 22:00 UTC", () => {
    // This is the exact bug scenario: a device clock reading UTC (2h "behind" Zurich in
    // summer) must still see the day change at this instant, not two hours later.
    expect(zurichDayKey(Date.UTC(2026, 7, 28, 22, 0, 0))).toBe("2026-08-29");
  });
});

describe("nextZurichMidnightAfter", () => {
  it("finds the next local midnight for a timestamp in the middle of the day", () => {
    // 10:00 UTC = 12:00 CEST on 29 Aug — next local midnight is the start of 30 Aug.
    const midday = Date.UTC(2026, 7, 29, 10, 0, 0);
    expect(nextZurichMidnightAfter(midday)).toBe(Date.UTC(2026, 7, 29, 22, 0, 0));
  });

  it("steps across the CEST->CET fall-back without drifting (23h/25h days)", () => {
    // 2026-10-25 is when Switzerland falls back from CEST to CET.
    const before = zurichMidnightMs(2026, 10, 24);
    const next = nextZurichMidnightAfter(before);
    expect(next).toBe(zurichMidnightMs(2026, 10, 25));
  });
});
