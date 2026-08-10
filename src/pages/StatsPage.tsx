import { useState } from "react";
import { DataTable } from "../components/DataTable";
import { LineChart, type LineChartPoint } from "../components/LineChart";
import { useMeasurements } from "../context/MeasurementsContext";
import { formatDate, formatNumber, metricLabel, metricSuffix } from "../lib/format";
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
    <section className="view-stack">
      <article className="card panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Statistiques</p>
            <h3>{metricLabel(metric)}</h3>
          </div>
          <div className="controls">
            <select value={metric} onChange={(event) => setMetric(event.target.value as MetricKey)}>
              {METRIC_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {metricLabel(option)}
                </option>
              ))}
            </select>
            <div className="segmented">
              {RANGE_OPTIONS.map((option) => (
                <button
                  key={option.key}
                  type="button"
                  className={`segment${range === option.key ? " active" : ""}`}
                  onClick={() => setRange(option.key)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <LineChart
          data={chartData}
          valueSuffix={suffix}
          ariaLabel={`Courbe ${metricLabel(metric)} sur ${range}`}
          emptyMessage="Aucune donnée sur cette période."
        />

        <div className="chart-legend">
          {chartData.length > 0
            ? `Série affichée : ${metricLabel(metric)}. ${chartData.length} points sur ${range}.`
            : "Recharge la page ou élargis la fenêtre temporelle."}
          {chartData.length > 0 && (
            <button type="button" className="ghost-btn table-toggle" onClick={() => setShowTable((v) => !v)}>
              {showTable ? "Masquer le tableau" : "Afficher en tableau"}
            </button>
          )}
        </div>

        {showTable && <DataTable rows={sortDescendingByCapturedAt(filtered)} />}
      </article>

      <div className="grid cards-3">
        <article className="card metric-card">
          <span>Moyenne</span>
          <strong>{formatNumber(avg, suffix)}</strong>
          <small>{chartData.length} points sur {range}</small>
        </article>
        <article className="card metric-card">
          <span>Min / Max</span>
          <strong>
            {formatNumber(min)} / {formatNumber(max)}
          </strong>
          <small>Amplitude des mesures</small>
        </article>
        <article className="card metric-card">
          <span>Dernière valeur</span>
          <strong>{formatNumber(last, suffix)}</strong>
          <small>
            {chartData.length > 0 ? `Dernière donnée le ${formatDate(chartData.at(-1)?.x)}` : "-"}
          </small>
        </article>
      </div>
    </section>
  );
}
