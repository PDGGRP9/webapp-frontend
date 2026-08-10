import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { fetchDatas, fetchStatistics } from "../api/client";
import type { Measurement, Statistics } from "../api/types";
import { isUnauthorizedError, useAuth } from "./AuthContext";

const POLL_INTERVAL_MS = 15_000;

interface MeasurementsContextValue {
  datas: Measurement[];
  statistics: Statistics | null;
  isLoading: boolean;
  error: string | null;
  lastSyncAt: string | null;
  refresh: () => Promise<void>;
}

const MeasurementsContext = createContext<MeasurementsContextValue | null>(null);

export function MeasurementsProvider({ children }: { children: ReactNode }) {
  const { user, token, apiBaseUrl, reportUnauthorized } = useAuth();
  const [datas, setDatas] = useState<Measurement[]>([]);
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!user || !token) return;
    try {
      const [datasResponse, statisticsResponse] = await Promise.all([
        fetchDatas(apiBaseUrl, token, user.id, 500),
        fetchStatistics(apiBaseUrl, token, user.id),
      ]);
      setDatas(datasResponse.datas);
      setStatistics(statisticsResponse.statistics);
      setLastSyncAt(new Date().toISOString());
      setError(null);
    } catch (caughtError) {
      if (isUnauthorizedError(caughtError)) {
        reportUnauthorized();
        return;
      }
      setError(caughtError instanceof Error ? caughtError.message : "Erreur inconnue");
    } finally {
      setIsLoading(false);
    }
  }, [apiBaseUrl, token, user, reportUnauthorized]);

  useEffect(() => {
    setIsLoading(true);
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, apiBaseUrl]);

  useEffect(() => {
    if (!user || !token) return undefined;
    const id = setInterval(refresh, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [user, token, refresh]);

  const value = useMemo<MeasurementsContextValue>(
    () => ({ datas, statistics, isLoading, error, lastSyncAt, refresh }),
    [datas, statistics, isLoading, error, lastSyncAt, refresh],
  );

  return <MeasurementsContext.Provider value={value}>{children}</MeasurementsContext.Provider>;
}

export function useMeasurements(): MeasurementsContextValue {
  const context = useContext(MeasurementsContext);
  if (!context) throw new Error("useMeasurements must be used within a MeasurementsProvider");
  return context;
}
