// Contexto de autenticación: maneja el usuario, el token y los roles.
// Patrón SI1: React Context + localStorage para el token Sanctum.

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { apiClient, clearToken, getToken, setToken } from "@/lib/apiClient";

// Roles del sistema (espejo de users.rol en el backend).
export type Rol =
  | "admin"
  | "coordinador_academico"
  | "docente"
  | "autoridad"
  | "postulante";

export interface User {
  id: number;
  name: string;
  email: string;
  rol: Rol;
}

interface LoginResponse {
  token: string;
  user: User;
}

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  // Verifica si el usuario tiene alguno de los roles indicados.
  hasRole: (...roles: Rol[]) => boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Al montar: si hay token guardado, rehidratamos el usuario con /auth/me.
  useEffect(() => {
    const token = getToken();
    if (!token) {
      setLoading(false);
      return;
    }
    apiClient
      .get<{ data: User }>("/auth/me")
      .then((res) => setUser(res.data))
      .catch(() => clearToken())
      .finally(() => setLoading(false));
  }, []);

  // Inicia sesión, guarda el token y carga el usuario.
  async function login(email: string, password: string) {
    const res = await apiClient.post<LoginResponse>(
      "/auth/login",
      { email, password },
      false // login no requiere token previo
    );
    setToken(res.token);
    setUser(res.user);
  }

  // Cierra sesión en el backend y limpia el estado local.
  async function logout() {
    try {
      await apiClient.post("/auth/logout");
    } finally {
      clearToken();
      setUser(null);
    }
  }

  function hasRole(...roles: Rol[]) {
    return user ? roles.includes(user.rol) : false;
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, hasRole }}>
      {children}
    </AuthContext.Provider>
  );
}

// Hook de acceso al contexto; lanza si se usa fuera del provider.
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de AuthProvider.");
  return ctx;
}
