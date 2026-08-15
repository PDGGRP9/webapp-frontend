import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "../styles/login.css";

export function RegisterPage() {
  const { apiBaseUrl: defaultApiBaseUrl, register } = useAuth();
  const navigate = useNavigate();

  const [apiBaseUrl, setApiBaseUrl] = useState(defaultApiBaseUrl);
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [hint, setHint] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setHint("Création du compte…");
    try {
      await register(apiBaseUrl.trim().replace(/\/$/, ""), {
        email: email.trim(),
        username: username.trim(),
        password,
        first_name: firstName.trim() || undefined,
        last_name: lastName.trim() || undefined,
      });
      navigate("/", { replace: true });
    } catch (error) {
      setHint(error instanceof Error ? error.message : "Inscription impossible");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="login-page">
      <div className="login-card">
        <header className="login-topbar">
          <span className="login-tag">Projet PDG</span>
          <span className="login-tag login-tag-outline">Open source</span>
        </header>

        <section className="login-hero">
          <h1>Crée ton compte</h1>
          <p className="login-tagline">Un compte suffit pour suivre les mesures de ton bracelet.</p>
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
            <span>Nom d'utilisateur</span>
            <input
              type="text"
              required
              placeholder="demo"
              autoComplete="username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
            />
          </label>
          <label className="login-field">
            <span>Mot de passe</span>
            <input
              type="password"
              required
              minLength={8}
              placeholder="••••••••••"
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>
          <label className="login-field">
            <span>Prénom</span>
            <input type="text" value={firstName} onChange={(event) => setFirstName(event.target.value)} />
          </label>
          <label className="login-field">
            <span>Nom</span>
            <input type="text" value={lastName} onChange={(event) => setLastName(event.target.value)} />
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
            Créer le compte
          </button>
          {hint && <p className="login-hint">{hint}</p>}
          <div className="login-links">
            <Link to="/login">Déjà un compte ? Se connecter</Link>
          </div>
        </form>

        <footer className="login-footer">Tes données t'appartiennent</footer>
      </div>
    </main>
  );
}
