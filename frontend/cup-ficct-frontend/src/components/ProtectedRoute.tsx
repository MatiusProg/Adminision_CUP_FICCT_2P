// Envoltorio de rutas protegidas: exige sesión y, opcionalmente, ciertos roles.

import { type ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth, type Rol } from "@/context/AuthContext";

interface ProtectedRouteProps {
  children: ReactNode;
  // Si se indican roles, solo esos roles pueden entrar.
  roles?: Rol[];
}

export function ProtectedRoute({ children, roles }: ProtectedRouteProps) {
  const { user, loading } = useAuth();

  // Mientras se rehidrata la sesión, evitamos parpadeos de redirección.
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center text-muted-foreground">
        Cargando...
      </div>
    );
  }

  // Sin sesión: al login.
  if (!user) return <Navigate to="/login" replace />;

  // Con sesión pero sin el rol requerido: a una página segura.
  if (roles && !roles.includes(user.rol)) {
    return <Navigate to="/sin-permiso" replace />;
  }

  return <>{children}</>;
}
