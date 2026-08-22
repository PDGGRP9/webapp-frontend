import type {
  CheckEmailPayload,
  LoginPayload,
  Measurement,
  RegisterPayload,
  ResetPasswordPayload,
  Statistics,
  User,
} from "./types";

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

async function request<T>(
  baseUrl: string,
  path: string,
  options: RequestInit & { token?: string | null } = {},
): Promise<T> {
  const { token, headers, ...rest } = options;
  const finalHeaders = new Headers(headers);
  finalHeaders.set("Content-Type", "application/json");
  if (token) finalHeaders.set("Authorization", `Bearer ${token}`);

  let response: Response;
  try {
    response = await fetch(`${baseUrl}${path}`, { ...rest, headers: finalHeaders });
  } catch {
    throw new ApiError(0, "Impossible de joindre le back-end. Vérifie l'URL et la connexion réseau.");
  }

  const text = await response.text();
  let payload: unknown = {};
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      throw new ApiError(response.status, `Réponse invalide du serveur (HTTP ${response.status})`);
    }
  }

  if (!response.ok) {
    const detail =
      isRecord(payload) && typeof payload.detail === "string"
        ? payload.detail
        : `Erreur HTTP ${response.status}`;
    throw new ApiError(response.status, detail);
  }

  return payload as T;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export function register(baseUrl: string, payload: RegisterPayload): Promise<AuthResponse> {
  return request<{ user: User & { token: string } }>(baseUrl, "/api/register", {
    method: "POST",
    body: JSON.stringify(payload),
  }).then(({ user }) => ({ token: user.token, user }));
}

export function login(baseUrl: string, payload: LoginPayload): Promise<AuthResponse> {
  return request<AuthResponse>(baseUrl, "/api/login", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function checkEmail(baseUrl: string, payload: CheckEmailPayload): Promise<void> {
  return request(baseUrl, "/api/password/check-email", {
    method: "POST",
    body: JSON.stringify(payload),
  }).then(() => undefined);
}

export function resetPassword(baseUrl: string, payload: ResetPasswordPayload): Promise<void> {
  return request(baseUrl, "/api/password/reset", {
    method: "POST",
    body: JSON.stringify(payload),
  }).then(() => undefined);
}

export function logout(baseUrl: string, token: string): Promise<void> {
  return request(baseUrl, "/api/logout", { method: "POST", body: "{}", token }).then(() => undefined);
}

export function me(baseUrl: string, token: string): Promise<{ user: User }> {
  return request<{ user: User }>(baseUrl, "/api/me", { method: "GET", token });
}

export function deleteAllData(baseUrl: string, token: string): Promise<void> {
  return request(baseUrl, "/api/me/data", { method: "DELETE", token }).then(() => undefined);
}

export type ExportFormat = "json" | "csv";

export async function exportMyData(baseUrl: string, token: string, format: ExportFormat): Promise<Blob> {
  let response: Response;
  try {
    response = await fetch(`${baseUrl}/api/me/data/export?format=${format}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch {
    throw new ApiError(0, "Impossible de joindre le back-end. Vérifie l'URL et la connexion réseau.");
  }

  if (!response.ok) {
    let detail = `Erreur HTTP ${response.status}`;
    try {
      const payload = await response.json();
      if (isRecord(payload) && typeof payload.detail === "string") detail = payload.detail;
    } catch {
      // Le corps n'est pas du JSON exploitable, on garde le message générique.
    }
    throw new ApiError(response.status, detail);
  }

  return response.blob();
}

export interface DatasResponse {
  user_id: number;
  count: number;
  datas: Measurement[];
}

export function fetchDatas(
  baseUrl: string,
  token: string,
  userId: number,
  limit = 500,
): Promise<DatasResponse> {
  return request<DatasResponse>(baseUrl, `/api/datas/${userId}?limit=${limit}`, {
    method: "GET",
    token,
  });
}

export interface StatisticsResponse {
  user_id: number;
  statistics: Statistics;
}

export function fetchStatistics(
  baseUrl: string,
  token: string,
  userId: number,
): Promise<StatisticsResponse> {
  return request<StatisticsResponse>(baseUrl, `/api/statistics/${userId}`, {
    method: "GET",
    token,
  });
}
