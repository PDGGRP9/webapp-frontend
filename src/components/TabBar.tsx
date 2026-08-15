import { NavLink } from "react-router-dom";

export function TabBar() {
  return (
    <nav className="appx-tabbar" aria-label="Navigation principale">
      <NavLink to="/" end className={({ isActive }) => (isActive ? "on" : "")}>
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M3 12h4l2-5 4 10 2-5h6" />
        </svg>
        Direct
      </NavLink>
      <NavLink to="/stats" className={({ isActive }) => (isActive ? "on" : "")}>
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M5 20v-7M12 20V6M19 20v-4M3 20h18" />
        </svg>
        Historique
      </NavLink>
      <NavLink to="/account" className={({ isActive }) => (isActive ? "on" : "")}>
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="8" r="3.5" />
          <path d="M5 20c0-3.9 3.1-6 7-6s7 2.1 7 6" />
        </svg>
        Compte
      </NavLink>
    </nav>
  );
}
