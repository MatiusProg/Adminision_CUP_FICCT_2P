// Página de inicio de sesión (UC-01). Card centrado con email + contraseña.

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { ApiError } from "@/lib/apiClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    setSubmitting(true);
    try {
      await login(email, password);
      toast.success("Bienvenido al sistema.");
      navigate("/");
    } catch (err) {
      // E1: credenciales incorrectas / E5: error de conexión.
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
    <div className="flex min-h-screen items-center justify-center bg-muted px-4">
      <div className="w-full max-w-md rounded-3xl bg-card p-8 shadow-card">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold">CUP-FICCT</h1>
          <p className="text-sm text-muted-foreground">Sistema de Gestión de Admisión</p>
        </div>

        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="email">Correo electrónico</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="usuario@ficct.edu.bo"
              autoComplete="email"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="password">Contraseña</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            />
          </div>

          <Button onClick={handleSubmit} disabled={submitting} className="mt-2">
            {submitting ? "Ingresando..." : "Iniciar Sesión"}
          </Button>
        </div>
      </div>
    </div>
  );
}
