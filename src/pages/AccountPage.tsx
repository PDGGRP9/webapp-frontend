import { useState } from "react";
import { useNavigate } from "react-router-dom";
import type { ExportFormat } from "../api/client";
import { Avatar } from "../components/Avatar";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { useAuth } from "../context/AuthContext";
import { useMeasurements } from "../context/MeasurementsContext";
import { triggerBlobDownload } from "../lib/download";
import { initials } from "../lib/format";
import { latestMeasurement } from "../lib/measurements";

export function AccountPage() {
  const { user, logout, deleteAllData, exportData } = useAuth();
  const { datas, refresh } = useMeasurements();
  const navigate = useNavigate();
  const latest = latestMeasurement(datas);
  const bracelet = latest?.bracelet;

  const [collectConsent, setCollectConsent] = useState(true);
  const [localProcessing, setLocalProcessing] = useState(true);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [exportingFormat, setExportingFormat] = useState<ExportFormat | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

  const fullName = [user?.first_name, user?.last_name].filter(Boolean).join(" ") || user?.username || "-";

  async function handleLogout() {
    await logout();
    navigate("/login", { replace: true });
  }

  async function handleExport(format: ExportFormat) {
    setExportingFormat(format);
    setExportError(null);
    try {
      const blob = await exportData(format);
      triggerBlobDownload(blob, `mes-donnees.${format}`);
    } catch (error) {
      setExportError(error instanceof Error ? error.message : "Une erreur est survenue.");
    } finally {
      setExportingFormat(null);
    }
  }

  function openDeleteDialog() {
    setDeleteError(null);
    setIsDeleteDialogOpen(true);
  }

  async function handleConfirmDelete() {
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await deleteAllData();
      await refresh();
      setIsDeleteDialogOpen(false);
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : "Une erreur est survenue.");
    } finally {
      setIsDeleting(false);
    }
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

        <div className="export-row" style={{ marginTop: "0.9rem" }}>
          <button
            type="button"
            className="btn btn-ghost btn-inline"
            onClick={() => handleExport("json")}
            disabled={exportingFormat !== null}
          >
            {exportingFormat === "json" ? "Export…" : "Exporter en JSON"}
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-inline"
            onClick={() => handleExport("csv")}
            disabled={exportingFormat !== null}
          >
            {exportingFormat === "csv" ? "Export…" : "Exporter en CSV"}
          </button>
        </div>

        {exportError && (
          <p className="dialog-error" style={{ marginTop: "0.5rem" }}>
            {exportError}
          </p>
        )}

        <div style={{ marginTop: "0.6rem" }}>
          <button type="button" className="btn btn-danger" onClick={openDeleteDialog}>
            Supprimer toutes mes données
          </button>
        </div>

        <p className="note" style={{ marginTop: "0.9rem" }}>
          <b>Privacy by design</b> — données chiffrées au repos et en transit, pseudonymisation (séparation données
          brutes / identité), formats ouverts et documentés. Tes données t'appartiennent.
        </p>
      </section>

      <button type="button" className="btn btn-ghost" onClick={handleLogout}>
        Se déconnecter
      </button>

      {isDeleteDialogOpen && (
        <ConfirmDialog
          title="Supprimer toutes mes données"
          description="Cette action est définitive et irréversible : toutes tes mesures seront effacées. Ton bracelet reste appairé à ton compte. Il n'y a pas de retour en arrière possible."
          confirmWord="supprimer"
          confirmLabel="Supprimer définitivement"
          isSubmitting={isDeleting}
          error={deleteError}
          onConfirm={handleConfirmDelete}
          onCancel={() => setIsDeleteDialogOpen(false)}
        />
      )}
    </>
  );
}
