// Página de restablecimiento de contraseña (UC-22).
// Ruta pública: /reset-password?token=...&email=...
// Mejoras: ojo en ambos campos, validación visual de coincidencia,
// manejo de token expirado con link para solicitar nuevo enlace.

import { useState, useEffect } from "react";
import { useSearchParams, Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Eye, EyeOff, ShieldCheck, GraduationCap, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { apiClient, ApiError } from "@/lib/apiClient";

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Token y email vienen en la URL del link de recuperación.
  const token = searchParams.get("token") ?? "";
  const emailFromUrl = searchParams.get("email") ?? "";

  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  // Controla si se muestra error de token expirado.
  const [tokenExpirado, setTokenExpirado] = useState(false);
  // Controla si el reset fue exitoso.
  const [exitoso, setExitoso] = useState(false);

  // Redirige al login 3 segundos después del éxito.
  useEffect(() => {
    if (!exitoso) return;
    const timer = setTimeout(() => navigate("/login"), 3000);
    return () => clearTimeout(timer);
  }, [exitoso, navigate]);

  // Validaciones en tiempo real.
  const passwordValida = password.length >= 8;
  const coinciden = password === passwordConfirm && passwordConfirm.length > 0;
  const noCoinciden = passwordConfirm.length > 0 && password !== passwordConfirm;
  const canSubmit = passwordValida && coinciden && !submitting;

  // Token faltante — URL mal formada.
  if (!token || !emailFromUrl) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
            <AlertCircle className="h-8 w-8 text-destructive" />
          </div>
          <h2 className="font-heading text-xl font-bold">Enlace inválido</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            El enlace de recuperación es inválido o está incompleto.
          </p>
          <Link to="/forgot-password">
            <Button className="mt-6 w-full">Solicitar nuevo enlace</Button>
          </Link>
        </div>
      </div>
    );
  }

  async function handleSubmit() {
    if (!canSubmit) return;
    setSubmitting(true);

    try {
      await apiClient.post("/auth/reset-password", {
        token,
        email: emailFromUrl,
        password,
        password_confirmation: passwordConfirm,
      });

      setExitoso(true);
      toast.success("Contraseña restablecida. Redirigiendo al login...");
    } catch (err) {
      if (err instanceof ApiError) {
        // Detectar si el token expiró para mostrar UI específica.
        const esTokenExpirado = err.message?.toLowerCase().includes("expirado") ||
          err.message?.toLowerCase().includes("válido");

        if (esTokenExpirado) {
          setTokenExpirado(true);
        } else {
          toast.error(err.message ?? "No se pudo restablecer la contraseña.");
        }
      } else {
        toast.error("No se pudo conectar al servidor. Intente nuevamente.");
      }
    } finally {
      setSubmitting(false);
    }
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
            Nueva contraseña
            <span className="block text-gradient-ficct">CUP-FICCT</span>
          </h1>
          <p className="mt-4 max-w-md text-sidebar-foreground/70">
            Elija una contraseña segura de al menos 8 caracteres para proteger
            su cuenta institucional.
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
            <p className="text-sm text-muted-foreground">Nueva contraseña</p>
          </div>

          {/* ── Estado: token expirado ── */}
          {tokenExpirado ? (
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
                <AlertCircle className="h-8 w-8 text-destructive" />
              </div>
              <h2 className="font-heading text-xl font-bold">Enlace expirado</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                El enlace de recuperación ha expirado o ya fue utilizado.
                Solicite uno nuevo para continuar.
              </p>
              <Link to="/forgot-password">
                <Button className="mt-6 w-full">Solicitar nuevo enlace</Button>
              </Link>
              <div className="mt-4">
                <Link
                  to="/login"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Volver al inicio de sesión
                </Link>
              </div>
            </div>

          ) : exitoso ? (
            /* ── Estado: éxito ── */
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10">
                <CheckCircle2 className="h-8 w-8 text-emerald-500" />
              </div>
              <h2 className="font-heading text-xl font-bold">¡Contraseña actualizada!</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Su contraseña fue restablecida correctamente. Será redirigido al
                inicio de sesión en unos segundos.
              </p>
              <Link to="/login">
                <Button className="mt-6 w-full">Ir al inicio de sesión</Button>
              </Link>
            </div>

          ) : (
            /* ── Estado: formulario ── */
            <>
              <div className="mb-8 hidden lg:block">
                <h2 className="font-heading text-2xl font-bold">Nueva contraseña</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Elija una contraseña segura para su cuenta.
                </p>
              </div>

              <div className="grid gap-5">
                {/* Nueva contraseña con ojo */}
                <div className="grid gap-2">
                  <Label htmlFor="password">Nueva contraseña</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Mínimo 8 caracteres"
                      className={cn(
                        "h-11 pr-10",
                        password.length > 0 && !passwordValida && "border-destructive"
                      )}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {/* Indicador de longitud mínima */}
                  {password.length > 0 && !passwordValida && (
                    <p className="text-xs text-destructive">
                      La contraseña debe tener al menos 8 caracteres.
                    </p>
                  )}
                </div>

                {/* Confirmar contraseña con ojo y validación visual */}
                <div className="grid gap-2">
                  <Label htmlFor="passwordConfirm">Confirmar contraseña</Label>
                  <div className="relative">
                    <Input
                      id="passwordConfirm"
                      type={showPasswordConfirm ? "text" : "password"}
                      value={passwordConfirm}
                      onChange={(e) => setPasswordConfirm(e.target.value)}
                      placeholder="Repita la contraseña"
                      className={cn(
                        "h-11 pr-10",
                        noCoinciden && "border-destructive",
                        coinciden && "border-emerald-500"
                      )}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswordConfirm((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      aria-label={showPasswordConfirm ? "Ocultar contraseña" : "Mostrar contraseña"}
                      tabIndex={-1}
                    >
                      {showPasswordConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {/* Indicador de coincidencia en tiempo real */}
                  {passwordConfirm.length > 0 && (
                    <p className={cn(
                      "flex items-center gap-1 text-xs",
                      coinciden ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"
                    )}>
                      {coinciden ? (
                        <><CheckCircle2 className="h-3 w-3" /> Las contraseñas coinciden</>
                      ) : (
                        <><XCircle className="h-3 w-3" /> Las contraseñas no coinciden</>
                      )}
                    </p>
                  )}
                </div>

                <Button
                  onClick={handleSubmit}
                  disabled={!canSubmit}
                  className="mt-2 h-11 text-base font-semibold"
                >
                  {submitting ? "Guardando..." : "Restablecer contraseña"}
                </Button>
              </div>

              <div className="mt-6 text-center">
                <Link
                  to="/login"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Volver al inicio de sesión
                </Link>
              </div>
            </>
          )}

          <p className="mt-8 text-center text-xs text-muted-foreground">
            © {new Date().getFullYear()} FICCT · UAGRM. Todos los derechos reservados.
          </p>
        </div>
      </div>
    </div>
  );
}
