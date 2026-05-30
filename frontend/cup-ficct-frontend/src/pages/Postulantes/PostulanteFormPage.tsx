// Formulario de postulante. En modo "nuevo" dispara el pago Stripe (no persiste
// hasta que el pago se complete). En modo "editar" actualiza un postulante existente.

import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import {
  postulanteService,
  type PostulanteFormData,
} from "@/services/postulanteService";
import { carrerasService, type Carrera } from "@/services/carrerasService";
import { ApiError } from "@/lib/apiClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Estado inicial vacío del formulario.
const emptyForm: PostulanteFormData = {
  carrera_1ra_opcion_id: 0,
  carrera_2da_opcion_id: 0,
  ci: "",
  nombres: "",
  apellidos: "",
  fecha_nacimiento: "",
  sexo: "M",
  direccion: "",
  telefono: "",
  email: "",
  colegio: "",
  ciudad: "",
  titulo_bachiller: false,
};

export function PostulanteFormPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const esEdicion = Boolean(id);

  const [form, setForm] = useState<PostulanteFormData>(emptyForm);
  const [carreras, setCarreras] = useState<Carrera[]>([]);
  // Errores de validación 422 devueltos por Laravel, por campo.
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [submitting, setSubmitting] = useState(false);

  // Carga el catálogo de carreras y, si es edición, los datos del postulante.
  useEffect(() => {
    carrerasService.list().then((res) => setCarreras(res.data)).catch(() => {});
    if (esEdicion && id) {
      postulanteService.get(Number(id)).then((res) => {
        const p = res.data;
        setForm({
          carrera_1ra_opcion_id: p.carrera_1ra_opcion_id,
          carrera_2da_opcion_id: p.carrera_2da_opcion_id,
          ci: p.ci,
          nombres: p.nombres,
          apellidos: p.apellidos,
          fecha_nacimiento: p.fecha_nacimiento?.slice(0, 10) ?? "",
          sexo: p.sexo,
          direccion: p.direccion ?? "",
          telefono: p.telefono ?? "",
          email: p.email ?? "",
          colegio: p.colegio ?? "",
          ciudad: p.ciudad ?? "",
          titulo_bachiller: p.titulo_bachiller,
        });
      });
    }
  }, [esEdicion, id]);

  // Actualiza un campo del formulario de forma genérica.
  function set<K extends keyof PostulanteFormData>(key: K, value: PostulanteFormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit() {
    setErrors({});
    setSubmitting(true);
    try {
      if (esEdicion && id) {
        // Modo edición: actualiza directamente.
        await postulanteService.update(Number(id), form);
        toast.success("Postulante actualizado correctamente.");
        navigate("/postulantes");
      } else {
        // Modo nuevo: inicia el pago. Si Stripe devuelve URL, redirigimos allí.
        const res = await postulanteService.iniciarPago(form);
        toast.message("Redirigiendo a la pasarela de pago...");
        window.location.href = res.checkout_url;
      }
    } catch (err) {
      if (err instanceof ApiError && err.status === 422 && err.errors) {
        setErrors(err.errors);
        toast.error("Revise los campos marcados.");
      } else if (err instanceof ApiError) {
        toast.error(err.message);
      } else {
        toast.error("Ocurrió un error inesperado.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  // Muestra el primer error de un campo, si existe.
  function fieldError(name: string) {
    return errors[name]?.[0];
  }

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-6 text-2xl font-bold">
        {esEdicion ? "Editar postulante" : "Registrar postulante"}
      </h1>

      <div className="rounded-3xl bg-card p-8 shadow-card">
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          {/* CI */}
          <div className="grid gap-2">
            <Label htmlFor="ci">Carnet de Identidad *</Label>
            <Input id="ci" value={form.ci} onChange={(e) => set("ci", e.target.value)} />
            {fieldError("ci") && <p className="text-sm text-destructive">{fieldError("ci")}</p>}
          </div>

          {/* Fecha de nacimiento */}
          <div className="grid gap-2">
            <Label htmlFor="fecha_nacimiento">Fecha de nacimiento *</Label>
            <Input
              id="fecha_nacimiento"
              type="date"
              value={form.fecha_nacimiento}
              onChange={(e) => set("fecha_nacimiento", e.target.value)}
            />
            {fieldError("fecha_nacimiento") && (
              <p className="text-sm text-destructive">{fieldError("fecha_nacimiento")}</p>
            )}
          </div>

          {/* Nombres */}
          <div className="grid gap-2">
            <Label htmlFor="nombres">Nombres *</Label>
            <Input id="nombres" value={form.nombres} onChange={(e) => set("nombres", e.target.value)} />
            {fieldError("nombres") && (
              <p className="text-sm text-destructive">{fieldError("nombres")}</p>
            )}
          </div>

          {/* Apellidos */}
          <div className="grid gap-2">
            <Label htmlFor="apellidos">Apellidos *</Label>
            <Input
              id="apellidos"
              value={form.apellidos}
              onChange={(e) => set("apellidos", e.target.value)}
            />
            {fieldError("apellidos") && (
              <p className="text-sm text-destructive">{fieldError("apellidos")}</p>
            )}
          </div>

          {/* Sexo */}
          <div className="grid gap-2">
            <Label>Sexo *</Label>
            <Select value={form.sexo} onValueChange={(v) => set("sexo", v as "M" | "F")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="M">Masculino</SelectItem>
                <SelectItem value="F">Femenino</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Email */}
          <div className="grid gap-2">
            <Label htmlFor="email">Correo electrónico</Label>
            <Input
              id="email"
              type="email"
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
            />
            {fieldError("email") && (
              <p className="text-sm text-destructive">{fieldError("email")}</p>
            )}
          </div>

          {/* Teléfono */}
          <div className="grid gap-2">
            <Label htmlFor="telefono">Teléfono</Label>
            <Input
              id="telefono"
              value={form.telefono}
              onChange={(e) => set("telefono", e.target.value)}
            />
          </div>

          {/* Ciudad */}
          <div className="grid gap-2">
            <Label htmlFor="ciudad">Ciudad</Label>
            <Input id="ciudad" value={form.ciudad} onChange={(e) => set("ciudad", e.target.value)} />
          </div>

          {/* Colegio */}
          <div className="grid gap-2">
            <Label htmlFor="colegio">Colegio de procedencia</Label>
            <Input
              id="colegio"
              value={form.colegio}
              onChange={(e) => set("colegio", e.target.value)}
            />
          </div>

          {/* Dirección */}
          <div className="grid gap-2">
            <Label htmlFor="direccion">Dirección</Label>
            <Input
              id="direccion"
              value={form.direccion}
              onChange={(e) => set("direccion", e.target.value)}
            />
          </div>

          {/* Carrera 1ra opción */}
          <div className="grid gap-2">
            <Label>Carrera (1ra opción) *</Label>
            <Select
              value={form.carrera_1ra_opcion_id ? String(form.carrera_1ra_opcion_id) : ""}
              onValueChange={(v) => set("carrera_1ra_opcion_id", Number(v))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccione una carrera" />
              </SelectTrigger>
              <SelectContent>
                {carreras.map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>
                    {c.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {fieldError("carrera_1ra_opcion_id") && (
              <p className="text-sm text-destructive">{fieldError("carrera_1ra_opcion_id")}</p>
            )}
          </div>

          {/* Carrera 2da opción */}
          <div className="grid gap-2">
            <Label>Carrera (2da opción) *</Label>
            <Select
              value={form.carrera_2da_opcion_id ? String(form.carrera_2da_opcion_id) : ""}
              onValueChange={(v) => set("carrera_2da_opcion_id", Number(v))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccione una carrera" />
              </SelectTrigger>
              <SelectContent>
                {carreras.map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>
                    {c.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {fieldError("carrera_2da_opcion_id") && (
              <p className="text-sm text-destructive">{fieldError("carrera_2da_opcion_id")}</p>
            )}
          </div>
        </div>

        {/* Título de bachiller (solo booleano; no se sube archivo) */}
        <div className="mt-6 flex items-center gap-2">
          <Checkbox
            id="titulo_bachiller"
            checked={form.titulo_bachiller}
            onCheckedChange={(v) => set("titulo_bachiller", Boolean(v))}
          />
          <Label htmlFor="titulo_bachiller">Cuenta con título de bachiller</Label>
        </div>

        <div className="mt-8 flex flex-wrap justify-end gap-3">
          <Button variant="outline" onClick={() => navigate("/postulantes")}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting
              ? "Procesando..."
              : esEdicion
                ? "Guardar cambios"
                : "Continuar al pago"}
          </Button>
        </div>
      </div>
    </div>
  );
}
