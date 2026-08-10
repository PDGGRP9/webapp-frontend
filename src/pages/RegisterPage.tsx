import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

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
            <p className="eyebrow">Inscription</p>
            <h2>Crée ton compte</h2>
            <p>Un compte suffit pour suivre les mesures envoyées par ton bracelet une fois appairé depuis l'app Android.</p>
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
              Nom d'utilisateur
              <input
                type="text"
                required
                placeholder="demo"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
              />
            </label>
            <label>
              Mot de passe
              <input
                type="password"
                required
                minLength={8}
                placeholder="••••••••"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </label>
            <label>
              Prénom
              <input type="text" value={firstName} onChange={(event) => setFirstName(event.target.value)} />
            </label>
            <label>
              Nom
              <input type="text" value={lastName} onChange={(event) => setLastName(event.target.value)} />
            </label>
            <button className="primary-btn" type="submit" disabled={isSubmitting}>
              Créer le compte
            </button>
            {hint && <p className="helper">{hint}</p>}
            <p className="helper">
              Déjà un compte ? <Link to="/login">Se connecter</Link>
            </p>
          </form>
        </section>
      </main>
    </>
  );
}
