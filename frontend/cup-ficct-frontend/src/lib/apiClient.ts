// Cliente HTTP centralizado: fetch() con token Bearer desde localStorage.
// Patrón SI1: sin axios. Inyecta el token y normaliza errores 401/422.

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000/api";

// Clave bajo la que se guarda el token de Sanctum en localStorage.
const TOKEN_KEY = "cup_token";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

// Error tipado que conserva el status y los errores de validación 422 de Laravel.
export class ApiError extends Error {
  status: number;
  errors?: Record<string, string[]>;

  constructor(message: string, status: number, errors?: Record<string, string[]>) {
    super(message);
    this.status = status;
    this.errors = errors;
  }
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  // Permite peticiones sin token (login).
  auth?: boolean;
}

// Función base que arma la petición, inyecta el token y procesa la respuesta.
async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, auth = true } = options;

  const headers: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": "application/json",
  };

  if (auth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  // 204 sin cuerpo: devolvemos undefined casteado.
  if (response.status === 204) return undefined as T;

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    // Sesión expirada: limpiamos el token; el front redirige al login.
    if (response.status === 401) {
      clearToken();
    }
    throw new ApiError(
      data.message ?? "Ocurrió un error en la solicitud.",
      response.status,
      data.errors
    );
  }

  return data as T;
}

// Atajos por verbo HTTP.
export const apiClient = {
  get: <T>(path: string) => request<T>(path, { method: "GET" }),
  post: <T>(path: string, body?: unknown, auth = true) =>
    request<T>(path, { method: "POST", body, auth }),
  put: <T>(path: string, body?: unknown) => request<T>(path, { method: "PUT", body }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};
