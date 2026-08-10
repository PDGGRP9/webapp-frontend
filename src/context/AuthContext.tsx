import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { ApiError, login as apiLogin, logout as apiLogout, me as apiMe, register as apiRegister } from "../api/client";
import type { LoginPayload, RegisterPayload, User } from "../api/types";

const STORAGE_KEYS = {
  token: "pdg.token",
  user: "pdg.user",
  apiBaseUrl: "pdg.apiBaseUrl",
} as const;

function resolveDefaultApiBaseUrl(): string {
  const saved = localStorage.getItem(STORAGE_KEYS.apiBaseUrl);
  if (saved) return saved;
  if (window.location.port === "5173" || window.location.port === "3000") {
    return `${window.location.protocol}//${window.location.hostname}:8000`;
  }
  return window.location.origin.replace(/:\d+$/, ":8000");
}

interface AuthContextValue {
  user: User | null;
  token: string | null;
  apiBaseUrl: string;
  isLoading: boolean;
  setApiBaseUrl: (url: string) => void;
  login: (baseUrl: string, payload: LoginPayload) => Promise<void>;
  register: (baseUrl: string, payload: RegisterPayload) => Promise<void>;
  logout: () => Promise<void>;
  reportUnauthorized: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [apiBaseUrl, setApiBaseUrlState] = useState<string>(resolveDefaultApiBaseUrl);
  const [isLoading, setIsLoading] = useState(true);

  const persist = useCallback((nextToken: string | null, nextUser: User | null, baseUrl: string) => {
    if (nextToken) localStorage.setItem(STORAGE_KEYS.token, nextToken);
    else localStorage.removeItem(STORAGE_KEYS.token);
    if (nextUser) localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(nextUser));
    else localStorage.removeItem(STORAGE_KEYS.user);
    localStorage.setItem(STORAGE_KEYS.apiBaseUrl, baseUrl);
  }, []);

  const clearSession = useCallback(() => {
    setUser(null);
    setToken(null);
    localStorage.removeItem(STORAGE_KEYS.token);
    localStorage.removeItem(STORAGE_KEYS.user);
  }, []);

  useEffect(() => {
    const storedToken = localStorage.getItem(STORAGE_KEYS.token);
    const storedUserRaw = localStorage.getItem(STORAGE_KEYS.user);
    const baseUrl = resolveDefaultApiBaseUrl();
    setApiBaseUrlState(baseUrl);

    if (!storedToken || !storedUserRaw) {
      setIsLoading(false);
      return;
    }

    apiMe(baseUrl, storedToken)
      .then(({ user: freshUser }) => {
        setToken(storedToken);
        setUser(freshUser);
        persist(storedToken, freshUser, baseUrl);
      })
      .catch(() => {
        clearSession();
      })
      .finally(() => setIsLoading(false));
  }, [persist, clearSession]);

  const setApiBaseUrl = useCallback(
    (url: string) => {
      setApiBaseUrlState(url);
      localStorage.setItem(STORAGE_KEYS.apiBaseUrl, url);
    },
    [],
  );

  const login = useCallback(
    async (baseUrl: string, payload: LoginPayload) => {
      const response = await apiLogin(baseUrl, payload);
      setApiBaseUrlState(baseUrl);
      setToken(response.token);
      setUser(response.user);
      persist(response.token, response.user, baseUrl);
    },
    [persist],
  );

  const register = useCallback(
    async (baseUrl: string, payload: RegisterPayload) => {
      const response = await apiRegister(baseUrl, payload);
      setApiBaseUrlState(baseUrl);
      setToken(response.token);
      setUser(response.user);
      persist(response.token, response.user, baseUrl);
    },
    [persist],
  );

  const logout = useCallback(async () => {
    if (token) {
      try {
        await apiLogout(apiBaseUrl, token);
      } catch {
        // Déconnexion stateless côté serveur : on nettoie localement même en cas d'échec réseau.
      }
    }
    clearSession();
  }, [apiBaseUrl, token, clearSession]);

  const reportUnauthorized = useCallback(() => {
    clearSession();
  }, [clearSession]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      apiBaseUrl,
      isLoading,
      setApiBaseUrl,
      login,
      register,
      logout,
      reportUnauthorized,
    }),
    [user, token, apiBaseUrl, isLoading, setApiBaseUrl, login, register, logout, reportUnauthorized],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
}

export function isUnauthorizedError(error: unknown): error is ApiError {
  return error instanceof ApiError && error.status === 401;
}
