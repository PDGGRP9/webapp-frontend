import { useState } from "react";
import { DataTable } from "../components/DataTable";
import { LineChart, type LineChartPoint } from "../components/LineChart";
import { useMeasurements } from "../context/MeasurementsContext";
import { formatDate, formatNumber, headerDate, metricLabel, metricSuffix } from "../lib/format";
import { filterByRange, sortAscendingByCapturedAt, sortDescendingByCapturedAt } from "../lib/measurements";
import type { MetricKey, RangeKey } from "../api/types";

const METRIC_OPTIONS: MetricKey[] = ["heart_rate_bpm", "spo2_percent", "step_count", "signal_quality"];
const RANGE_OPTIONS: { key: RangeKey; label: string }[] = [
  { key: "24h", label: "24h" },
  { key: "7d", label: "7j" },
  { key: "30d", label: "30j" },
];

export function StatsPage() {
  const { datas } = useMeasurements();
  const [metric, setMetric] = useState<MetricKey>("heart_rate_bpm");
  const [range, setRange] = useState<RangeKey>("24h");
  const [showTable, setShowTable] = useState(false);

  const filtered = filterByRange(datas, range);
  const ascending = sortAscendingByCapturedAt(filtered);
  const chartData: LineChartPoint[] = ascending
    .map((record) => ({ x: record.captured_at, y: Number(record[metric]) }))
    .filter((point) => Number.isFinite(point.y));

  const values = chartData.map((point) => point.y);
  const avg = values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
  const min = values.length ? Math.min(...values) : null;
  const max = values.length ? Math.max(...values) : null;
  const last = values.length ? values[values.length - 1] : null;
  const suffix = metricSuffix(metric);

  return (
    <>
      <header className="appbar">
        <div>
          <h1>Historique</h1>
          <p className="sub">{headerDate()}</p>
        </div>
      </header>

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

      <section className="card">
        <p className="card-title micro">{metricLabel(metric)}</p>
        <LineChart
          data={chartData}
          valueSuffix={suffix}
          ariaLabel={`Courbe ${metricLabel(metric)} sur ${range}`}
          emptyMessage="Aucune donnée sur cette période."
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
            <div className="k micro">Moyenne</div>
          </div>
          <div className="stat">
            <div className="v">
              {formatNumber(min)} / {formatNumber(max)}
            </div>
            <div className="k micro">Min / Max</div>
          </div>
          <div className="stat">
            <div className="v">{formatNumber(last, suffix)}</div>
            <div className="k micro">Dernière{chartData.length > 0 ? ` · ${formatDate(chartData.at(-1)?.x)}` : ""}</div>
          </div>
        </div>
      </section>
    </>
  );
}
