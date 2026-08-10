import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useMeasurements } from "../context/MeasurementsContext";

export function NavBar() {
  const { logout } = useAuth();
  const { refresh } = useMeasurements();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate("/login", { replace: true });
  }

  return (
    <nav className="nav card">
      <div className="nav-group">
        <NavLink to="/" end className={({ isActive }) => `nav-btn${isActive ? " active" : ""}`}>
          Accueil
        </NavLink>
        <NavLink to="/stats" className={({ isActive }) => `nav-btn${isActive ? " active" : ""}`}>
          Statistiques
        </NavLink>
      </div>
      <div className="nav-group">
        <button className="ghost-btn" type="button" onClick={() => refresh()}>
          Rafraîchir
        </button>
        <button className="ghost-btn danger" type="button" onClick={handleLogout}>
          Déconnexion
        </button>
      </div>
    </nav>
  );
}
