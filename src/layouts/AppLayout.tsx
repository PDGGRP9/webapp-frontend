import { Outlet } from "react-router-dom";
import { AppHeader } from "../components/AppHeader";
import { NavBar } from "../components/NavBar";
import { MeasurementsProvider } from "../context/MeasurementsContext";

export function AppLayout() {
  return (
    <MeasurementsProvider>
      <div className="backdrop backdrop-a" />
      <div className="backdrop backdrop-b" />
      <AppHeader />
      <main className="layout">
        <section className="app-shell">
          <NavBar />
          <Outlet />
        </section>
      </main>
    </MeasurementsProvider>
  );
}
