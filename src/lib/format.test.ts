import { describe, expect, it } from "vitest";
import { formatNumber, metricSuffix } from "./format";

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
  it("gives signal_quality a percent suffix like spo2_percent", () => {
    expect(metricSuffix("signal_quality")).toBe(" %");
    expect(metricSuffix("spo2_percent")).toBe(" %");
    expect(metricSuffix("heart_rate_bpm")).toBe(" bpm");
    expect(metricSuffix("step_count")).toBe("");
  });
});
