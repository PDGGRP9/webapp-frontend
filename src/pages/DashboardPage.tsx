import { DataTable } from "../components/DataTable";
import { MetricCard } from "../components/MetricCard";
import { useMeasurements } from "../context/MeasurementsContext";
import { formatDate, formatNumber } from "../lib/format";
import { latestMeasurement, mostRecent } from "../lib/measurements";

function average(records: ReturnType<typeof mostRecent>, key: "heart_rate_bpm" | "spo2_percent" | "signal_quality") {
  const values = records
    .map((record) => Number(record[key]))
    .filter((value) => Number.isFinite(value));
  if (!values.length) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function DashboardPage() {
  const { datas, statistics, isLoading } = useMeasurements();
  const latest = latestMeasurement(datas);
  const recentEight = mostRecent(datas, 8);
  const recentTen = mostRecent(datas, 10);

  const summaryEntries: [string, number | null, string][] = statistics
    ? [
        ["Mesures reçues", statistics.measurements_count, "sur toutes les périodes"],
        ["BPM moyen", statistics.avg_heart_rate_bpm, "Bpm sur l'historique"],
        ["SpO2 moyen", statistics.avg_spo2_percent, "% sur l'historique"],
        ["Pas max", statistics.max_step_count, "plus grand cumul observé"],
      ]
    : [];

  return (
    <section className="view-stack">
      <div className="grid cards-4">
        <MetricCard
          label="Fréquence cardiaque"
          value={formatNumber(latest?.heart_rate_bpm, " bpm")}
          trend={`Moyenne 8 points: ${formatNumber(average(recentEight, "heart_rate_bpm"), " bpm")}`}
        />
        <MetricCard
          label="SpO2"
          value={formatNumber(latest?.spo2_percent, " %")}
          trend={`Moyenne 8 points: ${formatNumber(average(recentEight, "spo2_percent"), " %")}`}
        />
        <MetricCard
          label="Pas cumulés"
          value={formatNumber(latest?.step_count)}
          trend={`Dernier relevé: ${formatNumber(latest?.step_count)}`}
        />
        <MetricCard
          label="Qualité signal"
          value={formatNumber(latest?.signal_quality, " %")}
          trend={`Moyenne 8 points: ${formatNumber(average(recentEight, "signal_quality"), " %")}`}
        />
      </div>

      <div className="grid split">
        <article className="card panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Temps réel</p>
              <h3>Dernière mesure reçue</h3>
            </div>
            <span className="pill">{latest ? "En ligne" : "Inactif"}</span>
          </div>
          <div className="live-row">
            <div>
              <span className="label">Timestamp</span>
              <strong>{formatDate(latest?.captured_at)}</strong>
            </div>
            <div>
              <span className="label">Bracelet</span>
              <strong>{latest?.bracelet?.display_name || latest?.bracelet?.serial_number || "-"}</strong>
            </div>
          </div>
          <div className="live-note">
            {latest
              ? `Dernière mesure provenant de ${latest.source_topic || "la passerelle HTTP"}.`
              : isLoading
                ? "Chargement des données…"
                : "Aucune mesure reçue pour ce compte."}
          </div>
        </article>

        <article className="card panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Résumé</p>
              <h3>Statistiques globales</h3>
            </div>
          </div>
          <div className="summary-list">
            {summaryEntries.map(([label, value, meta]) => (
              <div className="summary-item" key={label}>
                <div>
                  <span>{label}</span>
                  <strong>{formatNumber(value)}</strong>
                </div>
                <div className="muted">{meta}</div>
              </div>
            ))}
          </div>
        </article>
      </div>

      <article className="card panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Historique</p>
            <h3>Dernières mesures</h3>
          </div>
        </div>
        <DataTable rows={recentTen} />
      </article>
    </section>
  );
}
