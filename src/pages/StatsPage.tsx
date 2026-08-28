import { useState } from "react";
import { DataTable } from "../components/DataTable";
import { LineChart, type LineChartPoint } from "../components/LineChart";
import { useMeasurements } from "../context/MeasurementsContext";
import { formatDate, formatNumber, headerDate, metricLabel, metricSuffix } from "../lib/format";
import {
  bucketAverage,
  dailyTotals,
  filterByRange,
  sortAscendingByCapturedAt,
  sortDescendingByCapturedAt,
} from "../lib/measurements";
import type { MetricKey, RangeKey } from "../api/types";

const METRIC_OPTIONS: MetricKey[] = ["heart_rate_bpm", "spo2_percent", "step_count", "signal_quality"];
const RANGE_OPTIONS: { key: RangeKey; label: string }[] = [
  { key: "24h", label: "24h" },
  { key: "7d", label: "7j" },
];
const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

// Per range:
// - pointBucketMs: bucket size for the red "raw" curve. We never plot one point per
//   sample (that's a black smear at high sampling rates) — we bucket-average into a
//   density that stays readable at the plot's pixel width, Garmin-style.
// - averageBucketMs: bucket size for the blue moving-average overlay.
// - rawGapMs / averageGapMs: how far apart two consecutive *bucketed* points must be
//   before the chart draws a gap instead of a line (i.e. "no data for a while").
const RANGE_CONFIG: Record<
  RangeKey,
  { spanMs: number; pointBucketMs: number; averageBucketMs: number; rawGapMs: number; averageGapMs: number }
> = {
  "24h": {
    spanMs: DAY_MS,
    pointBucketMs: MINUTE_MS,
    averageBucketMs: 15 * MINUTE_MS,
    rawGapMs: 3 * MINUTE_MS,
    // Just above the 15-minute average bucket: any bucket with zero raw samples in it
    // (a real silent period) breaks the blue line instead of bridging over it.
    averageGapMs: 20 * MINUTE_MS,
  },
  "7d": {
    spanMs: 7 * DAY_MS,
    pointBucketMs: MINUTE_MS,
    // Older days are only sampled every 5 minutes, so the raw-gap threshold has to
    // clear that normal sampling interval — otherwise every routine gap between two
    // samples reads as a "hole" and the curve turns into isolated dots.
    rawGapMs: 8 * MINUTE_MS,
    averageBucketMs: 15 * MINUTE_MS,
    averageGapMs: 20 * MINUTE_MS,
  },
};

export function StatsPage() {
  const { datas } = useMeasurements();
  const [metric, setMetric] = useState<MetricKey>("heart_rate_bpm");
  const [range, setRange] = useState<RangeKey>("24h");
  const [showTable, setShowTable] = useState(false);

  const filtered = filterByRange(datas, range);
  const config = RANGE_CONFIG[range];

  // Red curve: bucket-averaged points, spaced out for readability instead of one
  // point per raw sample.
  const chartData: LineChartPoint[] = bucketAverage(filtered, metric, config.pointBucketMs);

  // Summary numbers (avg/min/max/last) must reflect the real raw measurements, not
  // an average-of-averages, so they're computed separately from the bucketed data.
  const ascending = sortAscendingByCapturedAt(filtered);
  const lastRecord = ascending.at(-1) ?? null;
  const rawValues = ascending
    .map((record) => Number(record[metric]))
    .filter((value) => Number.isFinite(value));

  const averageData = bucketAverage(filtered, metric, config.averageBucketMs);
  const domainEnd = new Date();
  const domainStart = new Date(domainEnd.getTime() - config.spanMs);

  // step_count resets every midnight, so a plain avg/min/max over raw values is
  // meaningless (min is trivially ~0, avg mixes numbers from different days). Instead,
  // reduce to one "day's total" per day present, then summarize those.
  const isStepMetric = metric === "step_count";
  const summaryValues = isStepMetric ? dailyTotals(ascending, metric) : rawValues;
  const avg = summaryValues.length ? summaryValues.reduce((sum, value) => sum + value, 0) / summaryValues.length : null;
  const min = summaryValues.length ? Math.min(...summaryValues) : null;
  const max = summaryValues.length ? Math.max(...summaryValues) : null;
  const last = lastRecord ? Number(lastRecord[metric]) : null;
  const suffix = metricSuffix(metric);

  return (
    <>
      <header className="appbar">
        <div>
          <h1>Historique</h1>
          <p className="sub">{headerDate()}</p>
        </div>
      </header>

      <div className="stats-controls">
        <select
          className="field-select"
          value={metric}
          onChange={(event) => setMetric(event.target.value as MetricKey)}
        >
          {METRIC_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {metricLabel(option)}
            </option>
          ))}
        </select>

        <nav className="segmented" style={{ gridTemplateColumns: `repeat(${RANGE_OPTIONS.length}, 1fr)` }} aria-label="Période">
          {RANGE_OPTIONS.map((option) => (
            <button
              key={option.key}
              type="button"
              className={range === option.key ? "on" : ""}
              aria-current={range === option.key}
              onClick={() => setRange(option.key)}
            >
              {option.label}
            </button>
          ))}
        </nav>
      </div>

      <section className="card">
        <p className="card-title micro">{metricLabel(metric)}</p>
        <LineChart
          data={chartData}
          averageData={averageData}
          domainStart={domainStart.toISOString()}
          domainEnd={domainEnd.toISOString()}
          gapThresholdMs={config.rawGapMs}
          averageGapThresholdMs={config.averageGapMs}
          valueSuffix={suffix}
          ariaLabel={`Courbe ${metricLabel(metric)} sur ${range}`}
          emptyMessage="Aucune donnée sur cette période."
          minDomain={metric === "step_count" ? 0 : undefined}
        />
        <div className="chart-legend">
          {chartData.length > 0
            ? `${chartData.length} points sur ${range}.`
            : "Recharge la page ou élargis la fenêtre temporelle."}
          {chartData.length > 0 && (
            <button type="button" className="btn btn-ghost btn-inline" onClick={() => setShowTable((v) => !v)}>
              {showTable ? "Masquer le tableau" : "Afficher en tableau"}
            </button>
          )}
        </div>
        {showTable && (
          <div className="table-wrap">
            <DataTable rows={sortDescendingByCapturedAt(filtered)} />
          </div>
        )}
      </section>

      <section className="card">
        <p className="card-title micro">Résumé</p>
        <div className="stat-row num">
          <div className="stat">
            <div className="v">{formatNumber(avg, suffix)}</div>
            <div className="k micro">{isStepMetric ? "Moyenne / jour" : "Moyenne"}</div>
          </div>
          <div className="stat">
            <div className="v">
              {formatNumber(min)} / {formatNumber(max)}
            </div>
            <div className="k micro">{isStepMetric ? "Jour min / max" : "Min / Max"}</div>
          </div>
          <div className="stat">
            <div className="v">{formatNumber(last, suffix)}</div>
            <div className="k micro">
              {isStepMetric ? "Aujourd'hui" : "Dernière"}
              {lastRecord ? ` · ${formatDate(lastRecord.captured_at)}` : ""}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}