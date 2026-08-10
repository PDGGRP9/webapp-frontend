import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

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
    <>
      <header className="topbar">
        <div>
          <p className="eyebrow">Bracelet Connecte</p>
          <h1>Console santé temps réel</h1>
        </div>
      </header>
      <main className="layout">
        <section className="auth-panel card">
          <div className="auth-copy">
            <p className="eyebrow">Connexion</p>
            <h2>Accède à tes données de santé</h2>
            <p>Le front garde un token signé en local et interroge le back-end pour afficher les dernières mesures.</p>
          </div>
          <form className="auth-form" onSubmit={handleSubmit}>
            <label>
              URL du back-end
              <input
                type="url"
                required
                placeholder="http://localhost:8000"
                value={apiBaseUrl}
                onChange={(event) => setApiBaseUrl(event.target.value)}
              />
            </label>
            <label>
              Email
              <input
                type="email"
                required
                placeholder="demo@example.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </label>
            <label>
              Mot de passe
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </label>
            <button className="primary-btn" type="submit" disabled={isSubmitting}>
              Se connecter
            </button>
            <p className="helper">{hint}</p>
            <p className="helper">
              Pas de compte ? <Link to="/register">Créer un compte</Link>
            </p>
          </form>
        </section>
      </main>
    </>
  );
}
