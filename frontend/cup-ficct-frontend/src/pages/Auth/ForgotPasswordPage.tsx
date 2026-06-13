// Página de recuperación de contraseña (UC-22).
// Ruta pública: /forgot-password
// Solo para usuarios internos (admin, coordinador, autoridad, docente).
// Mejoras: estado de éxito inline, cooldown de 60s para evitar spam.

import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Mail, ArrowLeft, CheckCircle2, ShieldCheck, GraduationCap } from "lucide-react";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiClient } from "@/lib/apiClient";

// Duración del cooldown en segundos antes de permitir reenvío.
const COOLDOWN_SECONDS = 60;

export function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  // Controla si se muestra el panel de éxito o el formulario.
  const [enviado, setEnviado] = useState(false);
  // Contador de cooldown para reenvío.
  const [cooldown, setCooldown] = useState(0);

  // Countdown del cooldown — reduce 1 por segundo hasta llegar a 0.
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const canSubmit = email.trim().length > 0 && cooldown === 0;

  async function handleSubmit() {
    if (!canSubmit) return;
    setSubmitting(true);

    try {
      await apiClient.post("/auth/forgot-password", { email: email.trim() });
      setEnviado(true);
      // Iniciar cooldown para el botón de reenvío.
      setCooldown(COOLDOWN_SECONDS);
    } catch {
      // El backend responde 200 siempre — si llega aquí es un error de red.
      toast.error("No se pudo conectar al servidor. Intente nuevamente.");
    } finally {
      setSubmitting(false);
    }
  }

  function handleReenviar() {
    // Mantiene el email y permite reenviar tras el cooldown.
    setEnviado(false);
  }

  return (
    <div className="relative grid min-h-screen lg:grid-cols-2">
      {/* Toggle de tema */}
      <div className="absolute right-4 top-4 z-20">
        <ThemeToggle />
      </div>

      {/* ---- Panel izquierdo: identidad institucional ---- */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-sidebar p-12 lg:flex">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              "radial-gradient(ellipse 70% 50% at 30% 0%, oklch(0.7 0.13 195 / 0.25), transparent), radial-gradient(ellipse 60% 60% at 90% 100%, oklch(0.5 0.1 230 / 0.2), transparent)",
          }}
          aria-hidden
        />
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
            Recuperar acceso
            <span className="block text-gradient-ficct">CUP-FICCT</span>
          </h1>
          <p className="mt-4 max-w-md text-sidebar-foreground/70">
            Ingrese su correo institucional y le enviaremos un enlace para
            restablecer su contraseña.
          </p>
        </div>
        <div className="relative z-10 flex items-center gap-2 text-sm text-sidebar-foreground/50">
          <GraduationCap className="h-4 w-4" />
          <span>Universidad Autónoma Gabriel René Moreno</span>
        </div>
      </div>

      {/* ---- Panel derecho ---- */}
      <div className="bg-ficct-glow flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-sm">
          {/* Logo compacto móvil */}
          <div className="mb-8 flex flex-col items-center text-center lg:hidden">
            <Logo size={80} />
            <h1 className="mt-4 font-heading text-2xl font-bold">CUP-FICCT</h1>
            <p className="text-sm text-muted-foreground">Recuperar contraseña</p>
          </div>

          {/* ── Estado: formulario ── */}
          {!enviado ? (
            <>
              <div className="mb-8 hidden lg:block">
                <h2 className="font-heading text-2xl font-bold">Recuperar contraseña</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Ingrese su correo institucional para recibir el enlace de recuperación.
                </p>
              </div>

              <div className="grid gap-5">
                <div className="grid gap-2">
                  <Label htmlFor="email">Correo electrónico</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                    placeholder="usuario@ficct.uagrm.edu.bo"
                    className="h-11"
                  />
                </div>

                <Button
                  onClick={handleSubmit}
                  disabled={submitting || !canSubmit}
                  className="h-11 text-base font-semibold"
                >
                  <Mail className="mr-2 h-4 w-4" />
                  {submitting ? "Enviando..." : "Enviar enlace de recuperación"}
                </Button>
              </div>

              <div className="mt-6 text-center">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Volver al inicio de sesión
                </Link>
              </div>
            </>
          ) : (
            /* ── Estado: éxito inline ── */
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10">
                <CheckCircle2 className="h-8 w-8 text-emerald-500" />
              </div>

              <h2 className="font-heading text-xl font-bold">Revise su bandeja</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Si{" "}
                <span className="font-medium text-foreground">{email}</span>{" "}
                está registrado como usuario interno, recibirá un enlace para
                restablecer su contraseña en los próximos minutos.
              </p>

              <p className="mt-4 text-xs text-muted-foreground">
                Revise también su carpeta de spam si no lo encuentra.
              </p>

              {/* Botón de reenvío con cooldown */}
              <Button
                variant="outline"
                onClick={handleReenviar}
                disabled={cooldown > 0}
                className="mt-6 w-full"
              >
                {cooldown > 0
                  ? `Reenviar en ${cooldown}s`
                  : "Enviar de nuevo"}
              </Button>

              <div className="mt-4 text-center">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Volver al inicio de sesión
                </Link>
              </div>
            </div>
          )}

          <p className="mt-8 text-center text-xs text-muted-foreground">
            © {new Date().getFullYear()} FICCT · UAGRM. Todos los derechos reservados.
          </p>
        </div>
      </div>
    </div>
  );
}
