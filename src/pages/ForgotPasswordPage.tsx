import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "../styles/login.css";

const PASSWORD_MIN_LENGTH = 8;
const UPPERCASE_RE = /[A-Z]/;
const SPECIAL_CHAR_RE = /[^A-Za-z0-9]/;

function passwordStrengthError(password: string): string | null {
  if (password.length < PASSWORD_MIN_LENGTH) return "Le mot de passe doit contenir au moins 8 caractères.";
  if (!UPPERCASE_RE.test(password)) return "Le mot de passe doit contenir au moins une majuscule.";
  if (!SPECIAL_CHAR_RE.test(password)) return "Le mot de passe doit contenir au moins un caractère spécial.";
  return null;
}

export function ForgotPasswordPage() {
  const { apiBaseUrl, checkEmail, resetPassword } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [emailVerified, setEmailVerified] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);

  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [resetError, setResetError] = useState("");
  const [successHint, setSuccessHint] = useState("");
  const [isResetting, setIsResetting] = useState(false);

  async function handleEmailSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setEmailError("");
    setIsCheckingEmail(true);
    try {
      await checkEmail(apiBaseUrl, { email: email.trim() });
      setEmailVerified(true);
    } catch (error) {
      setEmailVerified(false);
      setEmailError(error instanceof Error ? error.message : "Utilisateur introuvable");
    } finally {
      setIsCheckingEmail(false);
    }
  }

  async function handleResetSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setResetError("");
    setSuccessHint("");

    if (password !== passwordConfirm) {
      setResetError("Les mots de passe ne correspondent pas.");
      return;
    }
    const strengthError = passwordStrengthError(password);
    if (strengthError) {
      setResetError(strengthError);
      return;
    }

    setIsResetting(true);
    try {
      await resetPassword(apiBaseUrl, {
        email: email.trim(),
        password,
        password_confirm: passwordConfirm,
      });
      setSuccessHint("Mot de passe mis à jour. Redirection vers la connexion…");
      setTimeout(() => navigate("/login", { replace: true }), 1200);
    } catch (error) {
      setResetError(error instanceof Error ? error.message : "Réinitialisation impossible");
    } finally {
      setIsResetting(false);
    }
  }

  return (
    <main className="login-page">
      <div className="login-card">
        <header className="login-topbar">
          <span className="login-tag login-tag-logo">
            <img src="/logo-favicon-noir.svg" alt="BraceCo" className="login-logo" />
          </span>
          <span className="login-tag login-tag-outline">Open source</span>
        </header>

        <section className="login-hero">
          <h1>Mot de passe oublié</h1>
          <p className="login-tagline">Retrouve l'accès à ton compte en deux étapes.</p>
        </section>

        {!emailVerified ? (
          <form className="login-form" onSubmit={handleEmailSubmit}>
            <label className="login-field">
              <span>Email</span>
              <input
                type="email"
                required
                placeholder="prenom.nom@exemple.ch"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </label>
            <button className="login-btn" type="submit" disabled={isCheckingEmail}>
              Vérifier
            </button>
            {emailError && <p className="login-hint login-hint-error">{emailError}</p>}
            <div className="login-links">
              <Link to="/login">Retour à la connexion</Link>
            </div>
          </form>
        ) : (
          <form className="login-form" onSubmit={handleResetSubmit}>
            <p className="login-hint">Compte trouvé : {email}</p>
            <label className="login-field">
              <span>Nouveau mot de passe</span>
              <input
                type="password"
                required
                placeholder="••••••••••"
                autoComplete="new-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </label>
            <label className="login-field">
              <span>Confirmer le mot de passe</span>
              <input
                type="password"
                required
                placeholder="••••••••••"
                autoComplete="new-password"
                value={passwordConfirm}
                onChange={(event) => setPasswordConfirm(event.target.value)}
              />
            </label>
            <p className="login-hint">Minimum 8 caractères, une majuscule et un caractère spécial.</p>
            <button className="login-btn" type="submit" disabled={isResetting}>
              Réinitialiser le mot de passe
            </button>
            {resetError && <p className="login-hint login-hint-error">{resetError}</p>}
            {successHint && <p className="login-hint">{successHint}</p>}
          </form>
        )}

        <footer className="login-footer">Tes données t'appartiennent</footer>
      </div>
    </main>
  );
}
