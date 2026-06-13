// Página de inicio de sesión (UC-01) — rediseñada con identidad FICCT.
// Panel partido: lado izquierdo institucional (escudo + marca), lado derecho
// el formulario. Fondo atmosférico con resplandor cian. Responsive.
// Mejoras UC-22: ojo para mostrar/ocultar contraseña, link "¿Olvidó su contraseña?",
// botón deshabilitado si los campos están vacíos.

import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "sonner";
import { GraduationCap, ShieldCheck, Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { ApiError } from "@/lib/apiClient";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  // Controla la visibilidad de la contraseña.
  const [showPassword, setShowPassword] = useState(false);

  // El botón solo se habilita si ambos campos tienen contenido.
  const canSubmit = email.trim().length > 0 && password.length > 0;

  async function handleSubmit() {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      await login(email, password);
      toast.success("Bienvenido al sistema.");
      navigate("/");
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.errors?.email?.[0] ?? err.message
          : "No se pudo conectar al servidor. Intente nuevamente.";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="relative grid min-h-screen lg:grid-cols-2">
      {/* Toggle de tema, esquina superior derecha */}
      <div className="absolute right-4 top-4 z-20">
        <ThemeToggle />
      </div>

      {/* ---- Panel izquierdo: identidad institucional ---- */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-sidebar p-12 lg:flex">
        {/* Resplandores de fondo */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              "radial-gradient(ellipse 70% 50% at 30% 0%, oklch(0.7 0.13 195 / 0.25), transparent), radial-gradient(ellipse 60% 60% at 90% 100%, oklch(0.5 0.1 230 / 0.2), transparent)",
          }}
          aria-hidden
        />
        {/* Patrón de cuadrícula sutil */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "linear-gradient(oklch(0.9 0 0) 1px, transparent 1px), linear-gradient(90deg, oklch(0.9 0 0) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
          aria-hidden
        />

        <div className="relative z-10 flex items-center gap-3 text-sidebar-foreground">
          <ShieldCheck className="h-6 w-6 text-primary" />
          <span className="font-heading text-sm font-semibold tracking-wide">
            UAGRM · FICCT
          </span>
        </div>

        <div className="relative z-10">
          <Logo size={120} className="mb-8" />
          <h1 className="font-heading text-4xl font-bold leading-tight text-sidebar-foreground">
            Sistema de Admisión
            <span className="block text-gradient-ficct">CUP-FICCT</span>
          </h1>
          <p className="mt-4 max-w-md text-sidebar-foreground/70">
            Plataforma de gestión del Curso Preuniversitario de la Facultad de Ingeniería
            en Ciencias de la Computación y Telecomunicaciones.
          </p>
        </div>

        <div className="relative z-10 flex items-center gap-2 text-sm text-sidebar-foreground/50">
          <GraduationCap className="h-4 w-4" />
          <span>Universidad Autónoma Gabriel René Moreno</span>
        </div>
      </div>

      {/* ---- Panel derecho: formulario ---- */}
      <div className="bg-ficct-glow flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-sm">
          {/* Logo compacto solo visible en móvil */}
          <div className="mb-8 flex flex-col items-center text-center lg:hidden">
            <Logo size={80} />
            <h1 className="mt-4 font-heading text-2xl font-bold">CUP-FICCT</h1>
            <p className="text-sm text-muted-foreground">Sistema de Admisión</p>
          </div>

          <div className="mb-8 hidden lg:block">
            <h2 className="font-heading text-2xl font-bold">Iniciar sesión</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Ingrese sus credenciales para continuar.
            </p>
          </div>

          <div className="grid gap-5">
            {/* Campo email */}
            <div className="grid gap-2">
              <Label htmlFor="email">Correo electrónico</Label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="usuario@ficct.uagrm.edu.bo"
                className="h-11"
              />
            </div>

            {/* Campo contraseña con ojo */}
            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Contraseña</Label>
                {/* Link de recuperación — solo para usuarios internos */}
                <Link
                  to="/forgot-password"
                  className="text-xs text-primary hover:underline"
                  tabIndex={-1}
                >
                  ¿Olvidó su contraseña?
                </Link>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                  className="h-11 pr-10"
                />
                {/* Botón ojo para mostrar/ocultar contraseña */}
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Botón de login — deshabilitado si campos vacíos */}
            <Button
              onClick={handleSubmit}
              disabled={submitting || !canSubmit}
              className="mt-2 h-11 text-base font-semibold"
            >
              {submitting ? "Ingresando..." : "Iniciar sesión"}
            </Button>
          </div>

          <p className="mt-8 text-center text-xs text-muted-foreground">
            © {new Date().getFullYear()} FICCT · UAGRM. Todos los derechos reservados.
          </p>
        </div>
      </div>
    </div>
  );
}