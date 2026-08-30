import { Outlet } from "react-router-dom";
import { Sidebar } from "../components/Sidebar";
import { TabBar } from "../components/TabBar";
import { MeasurementsProvider } from "../context/MeasurementsContext";
import "../styles/app.css";

export function AppLayout() {
  return (
    <MeasurementsProvider>
      <div className="appx-page">
        <div className="web-shell">
          <Sidebar />
          <main className="appx">
            <div className="appx-screen">
              <Outlet />
              <TabBar />
            </div>
          </main>
        </div>
      </div>
    </MeasurementsProvider>
  );
}
