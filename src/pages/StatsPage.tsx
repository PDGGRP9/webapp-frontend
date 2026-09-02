import { useState } from "react";
import { BarChart } from "../components/BarChart";
import { DataTable } from "../components/DataTable";
import { LineChart, type LineChartPoint } from "../components/LineChart";
import { useMeasurements } from "../context/MeasurementsContext";
import { APP_TIME_ZONE, formatDate, formatNumber, headerDate, metricLabel, metricSuffix } from "../lib/format";
import {
  bucketAverage,
  dailyStepTotals,
  dailyTotals,
  filterByRange,
  hourlyStepDeltas,
  movingAverage,
  sortAscendingByCapturedAt,
  sortDescendingByCapturedAt,
} from "../lib/measurements";
import type { MetricKey, RangeKey } from "../api/types";

const METRIC_OPTIONS: MetricKey[] = ["heart_rate_bpm", "spo2_percent", "step_count"];
// Only step_count has a 24h/7j choice — bpm and spo2 are single-purpose 7-day trend
// charts now (their "right now" values already live on the dashboard).
const STEP_RANGE_OPTIONS: { key: RangeKey; label: string }[] = [
  { key: "24h", label: "24h" },
  { key: "7d", label: "7j" },
];
const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;
const DAYS_IN_WEEK = 7;

// bpm/spo2 are always plotted over the last 7 days now (see STEP_RANGE_OPTIONS above).
// - pointBucketMs: bucket size for the red "raw" curve — never one point per sample (a
//   black smear at high sampling rates), bucket-averaged into a readable density instead.
// - averageWindowMs / averageStepMs: the blue overlay is a sliding-window mean (see
//   `movingAverage`) — at every `averageStepMs` it averages all raw samples within
//   ±averageWindowMs/2, so it stays a smooth dense curve even when the data is bursty.
// - rawGapMs / averageGapMs: how far apart two consecutive points must be before the
//   chart draws a gap instead of a line (i.e. "no data for a while"). Older days are
//   only sampled every 5 minutes, so this has to clear that normal sampling interval
//   or every routine gap reads as a "hole".
// - pxPerMinute: keeps the 7-day canvas to a few screen-widths of horizontal scroll
//   (the date header above the chart tracks the left edge as you scroll).
const LINE_CHART_CONFIG = {
  spanMs: DAYS_IN_WEEK * DAY_MS,
  pointBucketMs: MINUTE_MS,
  rawGapMs: 8 * MINUTE_MS,
  averageWindowMs: 30 * MINUTE_MS,
  averageStepMs: 5 * MINUTE_MS,
  averageGapMs: 20 * MINUTE_MS,
  pxPerMinute: 0.7,
};

function zurichHour(iso: string): number {
  return Number(
    new Intl.DateTimeFormat("en-GB", { hour: "2-digit", hourCycle: "h23", timeZone: APP_TIME_ZONE }).format(
      new Date(iso),
    ),
  );
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function StatsPage() {
  const { datas, error } = useMeasurements();
  const [metric, setMetric] = useState<MetricKey>("heart_rate_bpm");
  const [stepRange, setStepRange] = useState<RangeKey>("24h");
  const [showTable, setShowTable] = useState(false);

  const isStepMetric = metric === "step_count";
  // bpm/spo2 have no range toggle — they're always the 7-day view.
  const range: RangeKey = isStepMetric ? stepRange : "7d";
  const filtered = filterByRange(datas, range);
  const suffix = metricSuffix(metric);

  // ---- step_count: bar chart of per-period deltas (steps taken in each hour/day),
  // not the raw cumulative counter (see hourlyStepDeltas/dailyStepTotals). ----
  const stepBarData = isStepMetric
    ? stepRange === "24h"
      ? hourlyStepDeltas(datas)
      : dailyStepTotals(datas, DAYS_IN_WEEK)
    : [];

  // ---- heart_rate_bpm/spo2_percent: smoothed 7-day line chart. ----
  const chartData: LineChartPoint[] = isStepMetric ? [] : bucketAverage(filtered, metric, LINE_CHART_CONFIG.pointBucketMs);
  const averageData: LineChartPoint[] = isStepMetric
    ? []
    : movingAverage(filtered, metric, LINE_CHART_CONFIG.averageWindowMs, LINE_CHART_CONFIG.averageStepMs);
  const domainEnd = new Date();
  const domainStart = new Date(domainEnd.getTime() - LINE_CHART_CONFIG.spanMs);

  // Summary numbers (avg/min/max/last) always reflect a fixed 7-day window, independent
  // of which bar-chart range is selected for steps — so switching 24h/7j on the chart
  // above never makes the "Résumé" card below jump around.
  const summaryWindow = isStepMetric ? filterByRange(datas, "7d") : filtered;
  const ascending = sortAscendingByCapturedAt(summaryWindow);
  const lastRecord = ascending.at(-1) ?? null;
  const rawValues = ascending.map((record) => Number(record[metric])).filter((value) => Number.isFinite(value));
  const summaryValues = isStepMetric ? dailyTotals(ascending, metric) : rawValues;
  const avg = summaryValues.length ? summaryValues.reduce((sum, value) => sum + value, 0) / summaryValues.length : null;
  const min = summaryValues.length ? Math.min(...summaryValues) : null;
  const max = summaryValues.length ? Math.max(...summaryValues) : null;
  const last = lastRecord ? Number(lastRecord[metric]) : null;

  const hasData = isStepMetric ? filtered.length > 0 : chartData.length > 0;

  return (
    <>
      <header className="appbar">
        <div>
          <h1>Historique</h1>
          <p className="sub">{error ? error : headerDate()}</p>
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

        {isStepMetric && (
          <nav
            className="segmented"
            style={{ gridTemplateColumns: `repeat(${STEP_RANGE_OPTIONS.length}, 1fr)` }}
            aria-label="Période"
          >
            {STEP_RANGE_OPTIONS.map((option) => (
              <button
                key={option.key}
                type="button"
                className={stepRange === option.key ? "on" : ""}
                aria-current={stepRange === option.key}
                onClick={() => setStepRange(option.key)}
              >
                {option.label}
              </button>
            ))}
          </nav>
        )}
      </div>

      <section className="card">
        <p className="card-title micro">{metricLabel(metric)}</p>
        {isStepMetric ? (
          <BarChart
            data={stepBarData}
            valueSuffix={suffix}
            ariaLabel={
              stepRange === "24h"
                ? "Nombre de pas par heure sur les dernières 24 heures"
                : "Nombre de pas par jour sur les 7 derniers jours"
            }
            emptyMessage="Aucune donnée sur cette période."
            formatAxisLabel={(iso) => (stepRange === "24h" ? `${zurichHour(iso)}h` : capitalize(
              new Date(iso).toLocaleDateString("fr-FR", { weekday: "short", timeZone: APP_TIME_ZONE }),
            ))}
            formatTooltipLabel={(iso) =>
              stepRange === "24h"
                ? `${zurichHour(iso)}h – ${(zurichHour(iso) + 1) % 24}h`
                : capitalize(
                    new Date(iso).toLocaleDateString("fr-FR", {
                      weekday: "long",
                      day: "2-digit",
                      month: "long",
                      timeZone: APP_TIME_ZONE,
                    }),
                  )
            }
          />
        ) : (
          <LineChart
            data={chartData}
            averageData={averageData}
            domainStart={domainStart.toISOString()}
            domainEnd={domainEnd.toISOString()}
            gapThresholdMs={LINE_CHART_CONFIG.rawGapMs}
            averageGapThresholdMs={LINE_CHART_CONFIG.averageGapMs}
            pxPerMinute={LINE_CHART_CONFIG.pxPerMinute}
            valueSuffix={suffix}
            ariaLabel={`Courbe ${metricLabel(metric)} sur 7 jours`}
            emptyMessage="Aucune donnée sur cette période."
          />
        )}
        <div className="chart-legend">
          {isStepMetric
            ? stepRange === "24h"
              ? "Pas par heure sur les dernières 24h."
              : "Pas par jour sur les 7 derniers jours."
            : chartData.length > 0
              ? `${chartData.length} points sur 7 jours.`
              : "Recharge la page ou élargis la fenêtre temporelle."}
          {hasData && (
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
        <p className="card-title micro">Résumé · 7 jours</p>
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
