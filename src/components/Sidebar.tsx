import { useState } from "react";
import { NavLink } from "react-router-dom";
import { Avatar } from "./Avatar";
import { useAuth } from "../context/AuthContext";
import { initials } from "../lib/format";

const COLLAPSE_STORAGE_KEY = "pdg.sidebarCollapsed";

export function Sidebar() {
  const { user } = useAuth();
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem(COLLAPSE_STORAGE_KEY) === "1");
  const fullName = [user?.first_name, user?.last_name].filter(Boolean).join(" ") || user?.username || "Mon compte";

  function toggleCollapsed() {
    setCollapsed((previous) => {
      const next = !previous;
      localStorage.setItem(COLLAPSE_STORAGE_KEY, next ? "1" : "0");
      return next;
    });
  }

  return (
    <aside className={`web-sidebar${collapsed ? " collapsed" : ""}`} aria-label="Navigation principale">
      <div className="web-sidebar-top">
        <NavLink to="/" end className="web-brand" aria-label="Accueil">
          <img src="/logo-favicon-lime.svg" alt="" className="web-brand-logo" />
          <span className="web-brand-text">BraceCo</span>
        </NavLink>
        <button
          type="button"
          className="web-collapse-btn"
          onClick={toggleCollapsed}
          aria-pressed={collapsed}
          aria-label={collapsed ? "Déplier le menu" : "Réduire le menu"}
          title={collapsed ? "Déplier le menu" : "Réduire le menu"}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <rect x="3.5" y="4.5" width="17" height="15" rx="3" />
            <line x1="9.5" y1="4.5" x2="9.5" y2="19.5" />
          </svg>
        </button>
      </div>

      <nav className="web-nav">
        <NavLink
          to="/"
          end
          className={({ isActive }) => `web-nav-link${isActive ? " on" : ""}`}
          title="Données actuelles"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M3 12h4l2-5 4 10 2-5h6" />
          </svg>
          <span className="web-nav-label">Données actuelles</span>
        </NavLink>
        <NavLink to="/stats" className={({ isActive }) => `web-nav-link${isActive ? " on" : ""}`} title="Stats">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M5 20v-7M12 20V6M19 20v-4M3 20h18" />
          </svg>
          <span className="web-nav-label">Stats</span>
        </NavLink>
      </nav>

      <NavLink to="/account" className={({ isActive }) => `web-account${isActive ? " on" : ""}`} title="Compte">
        <Avatar small label={initials(user?.first_name, user?.last_name || user?.username)} />
        <span className="web-account-name">{fullName}</span>
      </NavLink>
    </aside>
  );
}
