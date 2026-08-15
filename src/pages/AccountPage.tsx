import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Avatar } from "../components/Avatar";
import { useAuth } from "../context/AuthContext";
import { useMeasurements } from "../context/MeasurementsContext";
import { initials } from "../lib/format";
import { latestMeasurement } from "../lib/measurements";

export function AccountPage() {
  const { user, logout } = useAuth();
  const { datas } = useMeasurements();
  const navigate = useNavigate();
  const latest = latestMeasurement(datas);
  const bracelet = latest?.bracelet;

  const [collectConsent, setCollectConsent] = useState(true);
  const [localProcessing, setLocalProcessing] = useState(true);

  const fullName = [user?.first_name, user?.last_name].filter(Boolean).join(" ") || user?.username || "-";

  async function handleLogout() {
    await logout();
    navigate("/login", { replace: true });
  }

  return (
    <>
      <header className="appbar">
        <div>
          <h1>Compte</h1>
        </div>
      </header>

      <section className="card profile">
        <Avatar label={initials(user?.first_name, user?.last_name || user?.username)} />
        <div className="who">
          <p className="name">{fullName}</p>
          <p className="mail">{user?.email || "-"}</p>
        </div>
      </section>

      <section className="card">
        <p className="card-title micro" style={{ marginBottom: "0.4rem" }}>
          Bracelet
        </p>
        <div className="setting">
          <div>
            <div className="label">{bracelet?.display_name || bracelet?.serial_number || "Aucun bracelet appairé"}</div>
            <p className="hint">
              {bracelet ? `Numéro de série ${bracelet.serial_number}` : "En attente d'un premier relevé."}
            </p>
          </div>
          <span className={`device${bracelet ? "" : " offline"}`}>
            <span className="led" />
            {bracelet ? "Appairé" : "Aucun"}
          </span>
        </div>
      </section>

      <section className="card">
        <p className="card-title micro" style={{ marginBottom: "0.4rem" }}>
          Mes données · RGPD
        </p>

        <div className="setting">
          <div>
            <div className="label">Consentement à la collecte</div>
            <p className="hint">Mesure du signal PPG et calcul du pouls. Révocable à tout moment.</p>
          </div>
          <label className="switch">
            <input
              type="checkbox"
              checked={collectConsent}
              onChange={(event) => setCollectConsent(event.target.checked)}
              aria-label="Consentement à la collecte"
            />
            <span className="track" />
          </label>
        </div>

        <div className="setting">
          <div>
            <div className="label">Traitement local privilégié</div>
            <p className="hint">Minimisation : seules les données nécessaires quittent l'appareil.</p>
          </div>
          <label className="switch">
            <input
              type="checkbox"
              checked={localProcessing}
              onChange={(event) => setLocalProcessing(event.target.checked)}
              aria-label="Traitement local privilégié"
            />
            <span className="track" />
          </label>
        </div>

        <div style={{ marginTop: "0.9rem" }}>
          <a className="btn btn-ghost" href="#">
            Exporter mes données (JSON / CSV)
          </a>
          <a className="btn btn-danger" href="#">
            Supprimer toutes mes données
          </a>
        </div>

        <p className="note" style={{ marginTop: "0.9rem" }}>
          <b>Privacy by design</b> — données chiffrées au repos et en transit, pseudonymisation (séparation données
          brutes / identité), formats ouverts et documentés. Tes données t'appartiennent.
        </p>
      </section>

      <button type="button" className="btn btn-ghost" onClick={handleLogout}>
        Se déconnecter
      </button>
    </>
  );
}
