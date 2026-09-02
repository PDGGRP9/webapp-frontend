import { Avatar } from "../components/Avatar";
import { useAuth } from "../context/AuthContext";
import { useMeasurements } from "../context/MeasurementsContext";
import { formatNumber, headerDate, initials, timeAgo } from "../lib/format";
import { latestMeasurement, metricStats, mostRecent } from "../lib/measurements";

const LIVE_WAVE_PATH =
  "M0 70 l10 0 l7 -46 l8 36 l6 -12 l8 14 l12 6 l49 2" +
  " l10 0 l7 -46 l8 36 l6 -12 l8 14 l12 6 l49 2".repeat(7);

export function DashboardPage() {
  const { user } = useAuth();
  const { datas, error } = useMeasurements();
  const latest = latestMeasurement(datas);
  const recentEight = mostRecent(datas, 8);

  const heartRate = metricStats(recentEight, "heart_rate_bpm");
  // The bracelet is the only step counter: it sends the day's running total (reset to 0 at
  // local midnight on the firmware side). We just show that value — nothing is re-derived here.
  const stepsToday = latest ? Number(latest.step_count) : null;
  const braceletLabel = latest?.bracelet?.display_name || latest?.bracelet?.serial_number || "Aucun bracelet";
  const online = Boolean(latest) && !error;
  const firstName = user?.first_name || user?.username || "";

  return (
    <>
      <header className="appbar">
        <div>
          <h1>Salut, {firstName || "toi"}</h1>
          <p className="sub">{headerDate()}</p>
        </div>
        <div className="appbar-actions">
          <span className={`device${online ? "" : " offline"}`}>
            <span className="led" />
            {braceletLabel}
          </span>
          <Avatar small to="/account" label={initials(user?.first_name, user?.last_name || user?.username)} />
        </div>
      </header>

      <section className="bpm-hero">
        <span className="micro" style={{ color: "var(--muted)" }}>
          Fréquence cardiaque
        </span>
        <div className="bpm-value">
          <span className="heart" aria-hidden="true">
            ❤️
          </span>
          <span className="n num">{formatNumber(latest?.heart_rate_bpm)}</span>
          <span className="unit">bpm</span>
        </div>
        <p className="state">
          {latest ? (
            <>
              Dernière mesure <b>{timeAgo(latest.captured_at)}</b>
            </>
          ) : (
            "En attente d'une première mesure"
          )}
        </p>
      </section>

      <section className="card">
        <p className="card-title micro">Signal en direct</p>
        <div className="live-chart" aria-label="Courbe du pouls en temps réel">
          <svg viewBox="0 0 800 96" preserveAspectRatio="none" aria-hidden="true">
            <path d={LIVE_WAVE_PATH} />
          </svg>
        </div>
        <div className="stat-row num">
          <div className="stat">
            <div className="v">{formatNumber(heartRate.min)}</div>
            <div className="k micro">Min</div>
          </div>
          <div className="stat">
            <div className="v">{formatNumber(heartRate.avg)}</div>
            <div className="k micro">Moy</div>
          </div>
          <div className="stat">
            <div className="v">{formatNumber(heartRate.max)}</div>
            <div className="k micro">Max</div>
          </div>
        </div>
      </section>

      <section>
        <p className="micro" style={{ color: "var(--muted)", margin: "0 0 0.6rem 0.2rem" }}>
          Autres métriques
        </p>
        <div className="metrics">
          <div className="metric is-live">
            <span className="ico" aria-hidden="true">
              🩸
            </span>
            <span className="value">{formatNumber(latest?.spo2_percent, " %")}</span>
            <span className="name">SpO2</span>
          </div>
          <div className="metric is-live">
            <span className="ico" aria-hidden="true">
              👣
            </span>
            <span className="value">{formatNumber(stepsToday)}</span>
            <span className="name">Pas aujourd'hui</span>
          </div>
        </div>
      </section>
    </>
  );
}
