// Enrutado principal de la aplicación. Define rutas públicas, protegidas por
// sesión y protegidas por rol. Envuelto en los providers de tema, autenticación
// y confirmación.

import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import { ThemeProvider } from "@/context/ThemeContext";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { ConfirmProvider } from "@/context/useConfirm";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppLayout } from "@/components/AppLayout";
import { LoginPage } from "@/pages/Auth/LoginPage";
import { PostulanteListPage } from "@/pages/Postulantes/PostulanteListPage";
import { PostulanteFormPage } from "@/pages/Postulantes/PostulanteFormPage";
import { PagoExitoPage, PagoCanceladoPage } from "@/pages/Postulantes/PagoResultPages";
import { CarrerasPage } from "@/pages/Admin/CarrerasPage";
import { ConfiguracionPage } from "@/pages/Admin/ConfiguracionPage";
import { GestionesPage } from "@/pages/Admin/GestionesPage";
import { DashboardPage } from "@/pages/Dashboard/DashboardPage";

// Redirige a la página inicial según el rol (autoridad no tiene postulantes-edición).
function HomeRedirect() {
  const { hasRole } = useAuth();
  if (hasRole("admin", "autoridad")) return <Navigate to="/dashboard" replace />;
  return <Navigate to="/postulantes" replace />;
}

// Página simple para accesos denegados por rol.
function SinPermiso() {
  return (
    <div className="flex h-full items-center justify-center text-center">
      <div>
        <h1 className="font-heading text-xl font-bold">Sin permiso</h1>
        <p className="text-muted-foreground">No tiene acceso a esta sección.</p>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ConfirmProvider>
          <BrowserRouter>
            <Toaster position="top-right" richColors />
            <Routes>
              {/* Públicas */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/pago/exito" element={<PagoExitoPage />} />
              <Route path="/pago/cancelado" element={<PagoCanceladoPage />} />

              {/* Protegidas con layout */}
              <Route
                element={
                  <ProtectedRoute>
                    <AppLayout />
                  </ProtectedRoute>
                }
              >
                <Route path="/" element={<HomeRedirect />} />
                <Route path="/sin-permiso" element={<SinPermiso />} />

                {/* Dashboard: admin y autoridad */}
                <Route
                  path="/dashboard"
                  element={
                    <ProtectedRoute roles={["admin", "autoridad"]}>
                      <DashboardPage />
                    </ProtectedRoute>
                  }
                />

                {/* Postulantes: lectura admin/coordinador/autoridad */}
                <Route
                  path="/postulantes"
                  element={
                    <ProtectedRoute roles={["admin", "coordinador_academico", "autoridad"]}>
                      <PostulanteListPage />
                    </ProtectedRoute>
                  }
                />
                {/* Crear/editar: admin/coordinador */}
                <Route
                  path="/postulantes/nuevo"
                  element={
                    <ProtectedRoute roles={["admin", "coordinador_academico"]}>
                      <PostulanteFormPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/postulantes/:id/editar"
                  element={
                    <ProtectedRoute roles={["admin", "coordinador_academico"]}>
                      <PostulanteFormPage />
                    </ProtectedRoute>
                  }
                />

                {/* Admin */}
                <Route
                  path="/carreras"
                  element={
                    <ProtectedRoute roles={["admin"]}>
                      <CarrerasPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/gestiones"
                  element={
                    <ProtectedRoute roles={["admin"]}>
                      <GestionesPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/configuracion"
                  element={
                    <ProtectedRoute roles={["admin"]}>
                      <ConfiguracionPage />
                    </ProtectedRoute>
                  }
                />
              </Route>

              {/* Cualquier otra ruta */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </ConfirmProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}