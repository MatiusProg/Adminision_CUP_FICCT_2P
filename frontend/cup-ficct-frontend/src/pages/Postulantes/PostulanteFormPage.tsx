// Formulario de postulante. En modo "nuevo" dispara el pago Stripe (no persiste
// hasta que el pago se complete). En modo "editar" actualiza un postulante existente.
// Rediseñado: secciones agrupadas con encabezados, campos con id/name,
// mejor jerarquía visual y feedback de errores más claro.

import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, CreditCard, Save, User, GraduationCap, MapPin } from "lucide-react";
import {
  postulanteService,
  type PostulanteFormData,
} from "@/services/postulanteService";
import { carrerasService, type Carrera } from "@/services/carrerasService";
import { ApiError } from "@/lib/apiClient";
import { PageHeader, ContentCard } from "@/components/ui-shared";
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
import { cn } from "@/lib/utils";

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

// Sección del formulario con encabezado e ícono.
function FormSection({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof User;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
        <Icon className="h-4 w-4 text-primary" />
        {title}
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{children}</div>
    </div>
  );
}

// Campo de formulario con label, input y error integrados.
function Field({
  label,
  required,
  error,
  children,
  full,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
  full?: boolean;
}) {
  return (
    <div className={cn("grid gap-1.5", full && "sm:col-span-2")}>
      <Label className="text-sm font-medium">
        {label}
        {required && <span className="ml-1 text-destructive">*</span>}
      </Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

export function PostulanteFormPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const esEdicion = Boolean(id);

  const [form, setForm] = useState<PostulanteFormData>(emptyForm);
  const [carreras, setCarreras] = useState<Carrera[]>([]);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [submitting, setSubmitting] = useState(false);

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

  function set<K extends keyof PostulanteFormData>(key: K, value: PostulanteFormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    // Limpia el error de ese campo al editar.
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: [] }));
  }

  async function handleSubmit() {
    setErrors({});
    setSubmitting(true);
    try {
      if (esEdicion && id) {
        await postulanteService.update(Number(id), form);
        toast.success("Postulante actualizado correctamente.");
        navigate("/postulantes");
      } else {
        const res = await postulanteService.iniciarPago(form);
        toast.message("Redirigiendo a la pasarela de pago...");
        window.location.href = res.checkout_url;
      }
    } catch (err) {
      if (err instanceof ApiError && err.status === 422 && err.errors) {
        setErrors(err.errors);
        toast.error("Revise los campos marcados en rojo.");
      } else if (err instanceof ApiError) {
        toast.error(err.message);
      } else {
        toast.error("Ocurrió un error inesperado.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  const fe = (name: string) => errors[name]?.[0];

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title={esEdicion ? "Editar postulante" : "Registrar postulante"}
        description={
          esEdicion
            ? "Modifique los datos del postulante."
            : "Complete el formulario. Al continuar, será redirigido a la pasarela de pago."
        }
      >
        <Button variant="ghost" size="sm" onClick={() => navigate("/postulantes")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver
        </Button>
      </PageHeader>

      <ContentCard className="p-6 sm:p-8">
        <div className="space-y-8">
          {/* Sección 1: Datos personales */}
          <FormSection icon={User} title="Datos personales">
            <Field label="Carnet de Identidad" required error={fe("ci")}>
              <Input
                id="ci"
                name="ci"
                value={form.ci}
                onChange={(e) => set("ci", e.target.value)}
                placeholder="Ej: 1234567"
                className={fe("ci") ? "border-destructive" : ""}
              />
            </Field>

            <Field label="Fecha de nacimiento" required error={fe("fecha_nacimiento")}>
              <Input
                id="fecha_nacimiento"
                name="fecha_nacimiento"
                type="date"
                value={form.fecha_nacimiento}
                onChange={(e) => set("fecha_nacimiento", e.target.value)}
                className={fe("fecha_nacimiento") ? "border-destructive" : ""}
              />
            </Field>

            <Field label="Nombres" required error={fe("nombres")}>
              <Input
                id="nombres"
                name="nombres"
                value={form.nombres}
                onChange={(e) => set("nombres", e.target.value)}
                placeholder="Ej: Juan Carlos"
                className={fe("nombres") ? "border-destructive" : ""}
              />
            </Field>

            <Field label="Apellidos" required error={fe("apellidos")}>
              <Input
                id="apellidos"
                name="apellidos"
                value={form.apellidos}
                onChange={(e) => set("apellidos", e.target.value)}
                placeholder="Ej: Pérez López"
                className={fe("apellidos") ? "border-destructive" : ""}
              />
            </Field>

            <Field label="Sexo" required error={fe("sexo")}>
              <Select value={form.sexo} onValueChange={(v) => set("sexo", v as "M" | "F")}>
                <SelectTrigger id="sexo" name="sexo">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="M">Masculino</SelectItem>
                  <SelectItem value="F">Femenino</SelectItem>
                </SelectContent>
              </Select>
            </Field>

            <Field label="Correo electrónico" error={fe("email")}>
              <Input
                id="email"
                name="email"
                type="email"
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
                placeholder="usuario@correo.com"
                autoComplete="email"
                className={fe("email") ? "border-destructive" : ""}
              />
            </Field>

            <Field label="Teléfono">
              <Input
                id="telefono"
                name="telefono"
                value={form.telefono}
                onChange={(e) => set("telefono", e.target.value)}
                placeholder="Ej: 76543210"
              />
            </Field>
          </FormSection>

          {/* Sección 2: Procedencia */}
          <FormSection icon={MapPin} title="Procedencia">
            <Field label="Ciudad">
              <Input
                id="ciudad"
                name="ciudad"
                value={form.ciudad}
                onChange={(e) => set("ciudad", e.target.value)}
                placeholder="Ej: Santa Cruz de la Sierra"
              />
            </Field>

            <Field label="Colegio de procedencia">
              <Input
                id="colegio"
                name="colegio"
                value={form.colegio}
                onChange={(e) => set("colegio", e.target.value)}
                placeholder="Nombre del colegio"
              />
            </Field>

            <Field label="Dirección" full>
              <Input
                id="direccion"
                name="direccion"
                value={form.direccion}
                onChange={(e) => set("direccion", e.target.value)}
                placeholder="Dirección de domicilio"
              />
            </Field>
          </FormSection>

          {/* Sección 3: Opciones de carrera */}
          <FormSection icon={GraduationCap} title="Opciones de carrera">
            <Field
              label="Carrera (1ra opción)"
              required
              error={fe("carrera_1ra_opcion_id")}
            >
              <Select
                value={form.carrera_1ra_opcion_id ? String(form.carrera_1ra_opcion_id) : ""}
                onValueChange={(v) => set("carrera_1ra_opcion_id", Number(v))}
              >
                <SelectTrigger id="carrera_1ra" name="carrera_1ra_opcion_id"
                  className={fe("carrera_1ra_opcion_id") ? "border-destructive" : ""}
                >
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
            </Field>

            <Field
              label="Carrera (2da opción)"
              required
              error={fe("carrera_2da_opcion_id")}
            >
              <Select
                value={form.carrera_2da_opcion_id ? String(form.carrera_2da_opcion_id) : ""}
                onValueChange={(v) => set("carrera_2da_opcion_id", Number(v))}
              >
                <SelectTrigger id="carrera_2da" name="carrera_2da_opcion_id"
                  className={fe("carrera_2da_opcion_id") ? "border-destructive" : ""}
                >
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
            </Field>
          </FormSection>

          {/* Título de bachiller */}
          <div className="flex items-start gap-3 rounded-lg border bg-muted/30 p-4">
            <Checkbox
              id="titulo_bachiller"
              checked={form.titulo_bachiller}
              onCheckedChange={(v) => set("titulo_bachiller", Boolean(v))}
              className="mt-0.5"
            />
            <div>
              <Label htmlFor="titulo_bachiller" className="cursor-pointer font-medium">
                Cuenta con título de bachiller
              </Label>
              <p className="text-xs text-muted-foreground">
                Marque si el postulante tiene título de bachillerato.
              </p>
            </div>
          </div>
        </div>

        {/* Acciones */}
        <div className="mt-8 flex flex-wrap justify-end gap-3 border-t pt-6">
          <Button variant="outline" onClick={() => navigate("/postulantes")}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={submitting} className="min-w-[160px]">
            {submitting ? (
              "Procesando..."
            ) : esEdicion ? (
              <>
                <Save className="mr-2 h-4 w-4" />
                Guardar cambios
              </>
            ) : (
              <>
                <CreditCard className="mr-2 h-4 w-4" />
                Continuar al pago
              </>
            )}
          </Button>
        </div>
      </ContentCard>
    </div>
  );
}
