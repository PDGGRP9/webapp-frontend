import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "../styles/login.css";

export function LoginPage() {
  const { apiBaseUrl: defaultApiBaseUrl, login } = useAuth();
  const navigate = useNavigate();

  const [apiBaseUrl, setApiBaseUrl] = useState(defaultApiBaseUrl);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [hint, setHint] = useState("Compte de test ou compte réel créé via l'inscription.");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setHint("Connexion en cours…");
    try {
      await login(apiBaseUrl.trim().replace(/\/$/, ""), { email: email.trim(), password });
      navigate("/", { replace: true });
    } catch (error) {
      setHint(error instanceof Error ? error.message : "Connexion impossible");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="login-page">
      <div className="login-card">
        <header className="login-topbar">
          <span className="login-tag login-tag-logo">
            <img src="/logo-favicon-noir.svg" alt="Bracelet connecté" className="login-logo" />
          </span>
          <span className="login-tag login-tag-outline">Open source</span>
        </header>

        <section className="login-hero">
          <h1>Bracelet connecté</h1>
          <p className="login-tagline">Open source. Sans abonnement. Sans espion.</p>
          <p className="login-note">
            Le front garde un token signé en local et interroge le back-end pour afficher les dernières mesures.
          </p>
          <div className="login-pulse" aria-hidden="true">
            <svg viewBox="0 0 800 40" preserveAspectRatio="none">
              <path d="M0 20 H72 l6 0 l6 -14 l7 28 l7 -22 l6 8 H200 H272 l6 0 l6 -14 l7 28 l7 -22 l6 8 H400 H472 l6 0 l6 -14 l7 28 l7 -22 l6 8 H600 H672 l6 0 l6 -14 l7 28 l7 -22 l6 8 H800" />
            </svg>
          </div>
        </section>

        <form className="login-form" onSubmit={handleSubmit}>
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
          <label className="login-field">
            <span>Mot de passe</span>
            <input
              type="password"
              required
              placeholder="••••••••••"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>
          <label className="login-field login-field-small">
            <span>URL du back-end</span>
            <input
              type="url"
              required
              placeholder="http://localhost:8000"
              value={apiBaseUrl}
              onChange={(event) => setApiBaseUrl(event.target.value)}
            />
          </label>

          <button className="login-btn" type="submit" disabled={isSubmitting}>
            Se connecter
          </button>
          <p className="login-hint">{hint}</p>
          <div className="login-links">
            <Link to="/forgot-password">Mot de passe oublié ?</Link>
            <Link to="/register">Créer un compte</Link>
          </div>
        </form>

        <footer className="login-footer">Tes données t'appartiennent</footer>
      </div>
    </main>
  );
}
