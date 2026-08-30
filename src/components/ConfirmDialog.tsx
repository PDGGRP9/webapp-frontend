import { useState, type FormEvent } from "react";

interface ConfirmDialogProps {
  title: string;
  description: string;
  confirmWord: string;
  confirmLabel: string;
  cancelLabel?: string;
  isSubmitting?: boolean;
  error?: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  title,
  description,
  confirmWord,
  confirmLabel,
  cancelLabel = "Annuler",
  isSubmitting = false,
  error,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const [input, setInput] = useState("");
  const isMatch = input.trim().toLowerCase() === confirmWord.toLowerCase();

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (isMatch && !isSubmitting) onConfirm();
  }

  return (
    <div className="dialog-overlay" role="presentation" onClick={onCancel}>
      <div
        className="dialog-panel"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        onClick={(event) => event.stopPropagation()}
      >
        <p id="dialog-title" className="dialog-title">
          {title}
        </p>
        <p className="dialog-description">{description}</p>

        <form onSubmit={handleSubmit}>
          <label className="dialog-field">
            <span>
              Tape « {confirmWord} » pour confirmer
            </span>
            <input
              type="text"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              autoFocus
              autoComplete="off"
              aria-label={`Tape ${confirmWord} pour confirmer`}
            />
          </label>

          {error && <p className="dialog-error">{error}</p>}

          <div className="dialog-actions">
            <button type="button" className="btn btn-ghost" onClick={onCancel} disabled={isSubmitting}>
              {cancelLabel}
            </button>
            <button type="submit" className="btn btn-danger" disabled={!isMatch || isSubmitting}>
              {isSubmitting ? "Suppression…" : confirmLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
