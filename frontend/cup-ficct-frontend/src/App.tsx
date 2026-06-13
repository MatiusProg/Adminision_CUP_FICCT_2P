// Enrutado principal de la aplicación.
// Rutas públicas, protegidas por sesión y protegidas por rol.
// Los módulos pendientes de implementación muestran PlaceholderPage.

import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import { ThemeProvider } from "@/context/ThemeContext";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { ConfirmProvider } from "@/context/useConfirm";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppLayout } from "@/components/AppLayout";
import { PlaceholderPage } from "@/components/PlaceholderPage";

// ── Páginas implementadas ─────────────────────────────────────────────────────
import { LoginPage } from "@/pages/Auth/LoginPage";
import { PostulanteListPage } from "@/pages/Postulantes/PostulanteListPage";
import { PostulanteFormPage } from "@/pages/Postulantes/PostulanteFormPage";
import { PagoExitoPage, PagoCanceladoPage } from "@/pages/Postulantes/PagoResultPages";
import { CarrerasPage } from "@/pages/Admin/CarrerasPage";
import { ConfiguracionPage } from "@/pages/Admin/ConfiguracionPage";
import { GestionesPage } from "@/pages/Admin/GestionesPage";
import { DashboardPage } from "@/pages/Dashboard/DashboardPage";
// ------------------- CICLO 2 -------------------
// CU-23 Consulta del Postulante 
import { MisMateriasPage } from "@/pages/Postulantes/MisMateriasPage";
import { MisNotasPage } from "@/pages/Postulantes/MisNotasPage";
// CU-22 Recuperación de contraseña
import { ForgotPasswordPage } from "@/pages/Auth/ForgotPasswordPage";
import { ResetPasswordPage } from "@/pages/Auth/ResetPasswordPage";

// ── Redirección según rol ─────────────────────────────────────────────────────
function HomeRedirect() {
  const { hasRole } = useAuth();
  if (hasRole("admin", "autoridad")) return <Navigate to="/dashboard" replace />;
  if (hasRole("postulante")) return <Navigate to="/mis-materias" replace />;
  return <Navigate to="/postulantes" replace />;
}

// ── Página sin permiso ────────────────────────────────────────────────────────
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

              {/* ── Rutas públicas ───────────────────────────────────────── */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/pago/exito" element={<PagoExitoPage />} />
              <Route path="/pago/cancelado" element={<PagoCanceladoPage />} />
              {/* UC-22: recuperar contraseña — públicas, se implementan en Fase 5 */}
             <Route
                path="/forgot-password"
                element={<ForgotPasswordPage />}
              />
              <Route
                path="/reset-password"
                element={<ResetPasswordPage />}
              />

              {/* ── Rutas protegidas con layout ──────────────────────────── */}
              <Route
                element={
                  <ProtectedRoute>
                    <AppLayout />
                  </ProtectedRoute>
                }
              >
                <Route path="/" element={<HomeRedirect />} />
                <Route path="/sin-permiso" element={<SinPermiso />} />

                {/* ── Paquete 6: Panel Administrativo ─────────────────── */}
                <Route
                  path="/dashboard"
                  element={
                    <ProtectedRoute roles={["admin", "autoridad"]}>
                      <DashboardPage />
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
                  path="/carreras"
                  element={
                    <ProtectedRoute roles={["admin"]}>
                      <CarrerasPage />
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

                {/* ── Paquete 2: Gestión de Postulantes ───────────────── */}
                <Route
                  path="/postulantes"
                  element={
                    <ProtectedRoute roles={["admin", "coordinador_academico", "autoridad"]}>
                      <PostulanteListPage />
                    </ProtectedRoute>
                  }
                />
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
                {/* UC-23: portal del postulante — se implementa en Fase 1 */}
                <Route
                  path="/mis-materias"
                  element={
                    <ProtectedRoute roles={["postulante"]}>
                      <MisMateriasPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/mis-notas"
                  element={
                    <ProtectedRoute roles={["postulante"]}>
                      <MisNotasPage />
                    </ProtectedRoute>
                  }
                />

                {/* ── Paquete 1: Autenticación y Seguridad ────────────── */}
                {/* UC-02: usuarios del sistema — se implementa en Fase 2 */}
                <Route
                  path="/usuarios"
                  element={
                    <ProtectedRoute roles={["admin"]}>
                      <PlaceholderPage
                        title="Usuarios del sistema"
                        description="Gestión de usuarios internos: admin, coordinadores, autoridades y docentes."
                      />
                    </ProtectedRoute>
                  }
                />

                {/* ── Paquete 3: Exámenes y Calificaciones ────────────── */}
                {/* UC-12/13 — se implementan en Fase 3 */}
                <Route
                  path="/notas"
                  element={
                    <ProtectedRoute roles={["admin", "coordinador_academico"]}>
                      <PlaceholderPage title="Registro de notas" />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/notas/calcular"
                  element={
                    <ProtectedRoute roles={["admin", "coordinador_academico"]}>
                      <PlaceholderPage title="Calcular promedios" />
                    </ProtectedRoute>
                  }
                />

                {/* ── Paquete 4: Grupos y Docentes ────────────────────── */}
                {/* UC-11/14/15/16/17 — se implementan en Fase 3 */}
                <Route
                  path="/docentes"
                  element={
                    <ProtectedRoute roles={["admin"]}>
                      <PlaceholderPage title="Docentes" />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/grupos"
                  element={
                    <ProtectedRoute roles={["admin"]}>
                      <PlaceholderPage title="Grupos" />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/cupos"
                  element={
                    <ProtectedRoute roles={["admin"]}>
                      <PlaceholderPage title="Asignación de cupos" />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/mis-grupos"
                  element={
                    <ProtectedRoute roles={["docente"]}>
                      <PlaceholderPage title="Mis grupos" />
                    </ProtectedRoute>
                  }
                />

                {/* ── Paquete 5: Reportes ──────────────────────────────── */}
                {/* UC-18/19 — se implementan en Fase 4 */}
                <Route
                  path="/reportes"
                  element={
                    <ProtectedRoute roles={["admin", "autoridad"]}>
                      <PlaceholderPage title="Reportes" />
                    </ProtectedRoute>
                  }
                />
              </Route>

              {/* Ruta catch-all */}
              <Route path="*" element={<Navigate to="/" replace />} />

            </Routes>
          </BrowserRouter>
        </ConfirmProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}