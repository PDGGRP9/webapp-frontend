import { useAuth } from "../context/AuthContext";
import { useMeasurements } from "../context/MeasurementsContext";
import { formatDate } from "../lib/format";
import { latestMeasurement } from "../lib/measurements";
import { StatusDot } from "./StatusDot";

export function AppHeader() {
  const { user } = useAuth();
  const { datas, error, lastSyncAt } = useMeasurements();
  const latest = latestMeasurement(datas);

  const online = !error;
  const statusLabel = error ?? "Connecté";
  const userLabel = user ? user.username || user.email : "-";
  const braceletLabel = latest?.bracelet?.display_name || latest?.bracelet?.serial_number || "Aucun";

  return (
    <>
      <header className="topbar">
        <div>
          <p className="eyebrow">Bracelet Connecte</p>
          <h1>Console santé temps réel</h1>
        </div>
        <StatusDot online={online} label={statusLabel} />
      </header>

      <section className="card hero">
        <div>
          <p className="eyebrow">Flux HTTPS direct</p>
          <h2>Suivi biométrique simple pour le web et l'Android</h2>
          <p className="hero-copy">
            Connexion, suivi en direct et statistiques historiques avec un contrat API unique.
          </p>
        </div>
        <div className="hero-metrics">
          <div>
            <span>Dernière synchro</span>
            <strong>{formatDate(lastSyncAt)}</strong>
          </div>
          <div>
            <span>Bracelet actif</span>
            <strong>{braceletLabel}</strong>
          </div>
          <div>
            <span>Utilisateur</span>
            <strong>{userLabel}</strong>
          </div>
        </div>
      </section>
    </>
  );
}
