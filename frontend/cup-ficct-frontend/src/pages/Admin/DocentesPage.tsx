// Gestión de docentes del CUP-FICCT (UC-11).
// Solo Administrador. Tabla con búsqueda y filtro de activos.
// Modal para crear/editar con campos de formación académica y cuenta opcional.

import { useEffect, useState } from "react";
import { Plus, Search, Pencil, UserX, UserCheck, GraduationCap, BadgeCheck } from "lucide-react";
import { toast } from "sonner";
import { useConfirm } from "@/context/useConfirm";
import {
  docentesService,
  type Docente,
  type DocenteInput,
  type GradoAcademico,
} from "@/services/docentesService";
import { PageHeader, ContentCard, SkeletonRows, EmptyState } from "@/components/ui-shared";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

// ── Colores por grado académico ───────────────────────────────────────────────
const gradoColors: Record<GradoAcademico, string> = {
  Licenciatura: "bg-primary/10 text-primary border-primary/20",
  Maestría: "bg-amber-500/10 text-amber-600 border-amber-500/20 dark:text-amber-400",
  Doctorado: "bg-purple-500/10 text-purple-600 border-purple-500/20 dark:text-purple-400",
};

// ── Estado inicial del formulario ─────────────────────────────────────────────
const formVacio: DocenteInput = {
  ci: "",
  nombres: "",
  apellidos: "",
  email: "",
  telefono: "",
  titulo: "",
  grado_academico: "Licenciatura",
  diplomado_docencia: false,
  crear_cuenta: false,
  password: "",
};

// ── Modal de creación/edición ─────────────────────────────────────────────────
function DocenteModal({
  open,
  docente,
  onClose,
  onSaved,
}: {
  open: boolean;
  docente: Docente | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<DocenteInput>(formVacio);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (docente) {
      setForm({
        ci: docente.ci,
        nombres: docente.nombres,
        apellidos: docente.apellidos,
        email: docente.email,
        telefono: docente.telefono ?? "",
        titulo: docente.titulo ?? "",
        grado_academico: docente.grado_academico,
        diplomado_docencia: docente.diplomado_docencia,
        crear_cuenta: false,
        password: "",
      });
    } else {
      setForm(formVacio);
    }
    setErrors({});
  }, [docente, open]);

  const esEdicion = Boolean(docente);

  function set(field: keyof DocenteInput, value: unknown) {
    setForm((f) => ({ ...f, [field]: value }));
    setErrors((e) => ({ ...e, [field]: "" }));
  }

  async function handleSave() {
    const errs: Record<string, string> = {};
    if (!form.ci.trim()) errs.ci = "El CI es obligatorio.";
    if (!form.nombres.trim()) errs.nombres = "Los nombres son obligatorios.";
    if (!form.apellidos.trim()) errs.apellidos = "Los apellidos son obligatorios.";
    if (!form.email.trim()) errs.email = "El correo es obligatorio.";
    if (!form.grado_academico) errs.grado_academico = "El grado académico es obligatorio.";
    if (form.crear_cuenta && !form.password) errs.password = "La contraseña es obligatoria para crear cuenta.";
    if (form.password && form.password.length < 8) errs.password = "Mínimo 8 caracteres.";
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setSaving(true);
    try {
      if (esEdicion && docente) {
        await docentesService.update(docente.id, {
          ci: form.ci,
          nombres: form.nombres,
          apellidos: form.apellidos,
          email: form.email,
          telefono: form.telefono,
          titulo: form.titulo,
          grado_academico: form.grado_academico,
          diplomado_docencia: form.diplomado_docencia,
        });
        toast.success("Docente actualizado correctamente.");
      } else {
        await docentesService.create(form);
        toast.success("Docente registrado correctamente.");
      }
      onSaved();
      onClose();
    } catch (err: unknown) {
      const e = err as { errors?: Record<string, string[]>; message?: string };
      if (e?.errors) {
        const mapped: Record<string, string> = {};
        Object.entries(e.errors).forEach(([k, v]) => { mapped[k] = v[0]; });
        setErrors(mapped);
      } else {
        toast.error(e?.message ?? "No se pudo guardar el docente.");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading">
            {esEdicion ? "Editar docente" : "Registrar docente"}
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          {/* CI */}
          <div className="grid gap-1.5">
            <Label htmlFor="d-ci">CI</Label>
            <Input
              id="d-ci"
              value={form.ci}
              onChange={(e) => set("ci", e.target.value)}
              placeholder="Ej: 7654321"
              className={errors.ci ? "border-destructive" : ""}
            />
            {errors.ci && <p className="text-xs text-destructive">{errors.ci}</p>}
          </div>

          {/* Nombres y apellidos en grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="d-nombres">Nombres</Label>
              <Input
                id="d-nombres"
                value={form.nombres}
                onChange={(e) => set("nombres", e.target.value)}
                className={errors.nombres ? "border-destructive" : ""}
              />
              {errors.nombres && <p className="text-xs text-destructive">{errors.nombres}</p>}
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="d-apellidos">Apellidos</Label>
              <Input
                id="d-apellidos"
                value={form.apellidos}
                onChange={(e) => set("apellidos", e.target.value)}
                className={errors.apellidos ? "border-destructive" : ""}
              />
              {errors.apellidos && <p className="text-xs text-destructive">{errors.apellidos}</p>}
            </div>
          </div>

          {/* Email y teléfono */}
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="d-email">Correo electrónico</Label>
              <Input
                id="d-email"
                type="email"
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
                className={errors.email ? "border-destructive" : ""}
              />
              {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="d-telefono">Teléfono</Label>
              <Input
                id="d-telefono"
                value={form.telefono}
                onChange={(e) => set("telefono", e.target.value)}
                placeholder="Opcional"
              />
            </div>
          </div>

          {/* Título y grado académico */}
          <div className="grid gap-1.5">
            <Label htmlFor="d-titulo">Título profesional</Label>
            <Input
              id="d-titulo"
              value={form.titulo}
              onChange={(e) => set("titulo", e.target.value)}
              placeholder="Ej: Lic. en Matemáticas"
            />
          </div>

          <div className="grid gap-1.5">
            <Label>Grado académico</Label>
            <Select
              value={form.grado_academico}
              onValueChange={(v) => set("grado_academico", v as GradoAcademico)}
            >
              <SelectTrigger className={errors.grado_academico ? "border-destructive" : ""}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Licenciatura">Licenciatura</SelectItem>
                <SelectItem value="Maestría">Maestría</SelectItem>
                <SelectItem value="Doctorado">Doctorado</SelectItem>
              </SelectContent>
            </Select>
            {errors.grado_academico && <p className="text-xs text-destructive">{errors.grado_academico}</p>}
          </div>

          {/* Diplomado en docencia */}
          <div className="flex items-center gap-2">
            <Checkbox
              id="d-diplomado"
              checked={form.diplomado_docencia}
              onCheckedChange={(v) => set("diplomado_docencia", Boolean(v))}
            />
            <Label htmlFor="d-diplomado" className="cursor-pointer">
              Tiene diplomado en docencia universitaria
            </Label>
          </div>

          {/* Sección de cuenta de acceso (solo en creación) */}
          {!esEdicion && (
            <div className="rounded-lg border border-dashed border-border p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="d-crear-cuenta"
                  checked={form.crear_cuenta}
                  onCheckedChange={(v) => set("crear_cuenta", Boolean(v))}
                />
                <Label htmlFor="d-crear-cuenta" className="cursor-pointer font-medium">
                  Crear cuenta de acceso al sistema
                </Label>
              </div>
              {form.crear_cuenta && (
                <div className="grid gap-1.5">
                  <Label htmlFor="d-password">Contraseña de acceso</Label>
                  <Input
                    id="d-password"
                    type="password"
                    value={form.password}
                    onChange={(e) => set("password", e.target.value)}
                    placeholder="Mínimo 8 caracteres"
                    className={errors.password ? "border-destructive" : ""}
                  />
                  {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
                  <p className="text-xs text-muted-foreground">
                    Se usará el correo electrónico del docente como nombre de usuario.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Guardando..." : esEdicion ? "Guardar cambios" : "Registrar docente"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────
export function DocentesPage() {
  const confirm = useConfirm();
  const [docentes, setDocentes] = useState<Docente[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filtroActivo, setFiltroActivo] = useState("todos");
  const [modalOpen, setModalOpen] = useState(false);
  const [docenteEditar, setDocenteEditar] = useState<Docente | null>(null);

  async function cargar() {
    setLoading(true);
    try {
      const params: { search?: string; activo?: boolean } = {};
      if (search) params.search = search;
      if (filtroActivo !== "todos") params.activo = filtroActivo === "activo";
      const res = await docentesService.list(params);
      setDocentes(res.data);
    } catch {
      toast.error("No se pudieron cargar los docentes.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { cargar(); }, [search, filtroActivo]);

  function abrirCrear() { setDocenteEditar(null); setModalOpen(true); }
  function abrirEditar(d: Docente) { setDocenteEditar(d); setModalOpen(true); }

  async function toggleActivo(d: Docente) {
    const accion = d.activo ? "desactivar" : "reactivar";
    const verbo = d.activo ? "Desactivar" : "Reactivar";
    const nombre = `${d.nombres} ${d.apellidos}`;
    const ok = await confirm({
      title: `${verbo} docente`,
      description: `¿Está seguro de ${accion} a ${nombre}?${d.activo && d.user_id ? " También se desactivará su cuenta de acceso al sistema." : ""}`,
      confirmLabel: verbo,
      variant: d.activo ? "destructive" : "default",
    });
    if (!ok) return;

    try {
      if (d.activo) {
        await docentesService.desactivar(d.id);
        toast.success(`Docente ${nombre} desactivado.`);
      } else {
        await docentesService.reactivar(d.id);
        toast.success(`Docente ${nombre} reactivado.`);
      }
      cargar();
    } catch (err: unknown) {
      const e = err as { message?: string };
      toast.error(e?.message ?? "No se pudo realizar la operación.");
    }
  }

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Docentes"
        description="Registro de docentes del CUP-FICCT. Se mantiene entre gestiones."
      >
        <Button onClick={abrirCrear} className="gap-2">
          <Plus className="h-4 w-4" />
          Registrar docente
        </Button>
      </PageHeader>

      {/* Filtros */}
      <ContentCard className="p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre, CI o correo..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={filtroActivo} onValueChange={setFiltroActivo}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="activo">Activos</SelectItem>
              <SelectItem value="inactivo">Inactivos</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </ContentCard>

      {/* Tabla */}
      <ContentCard>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="font-semibold">Docente</TableHead>
                <TableHead className="font-semibold">CI</TableHead>
                <TableHead className="font-semibold">Grado académico</TableHead>
                <TableHead className="font-semibold">Docencia</TableHead>
                <TableHead className="font-semibold">Cuenta</TableHead>
                <TableHead className="font-semibold">Estado</TableHead>
                <TableHead className="text-right font-semibold">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <SkeletonRows rows={5} cols={7} />
              ) : docentes.length === 0 ? (
                <EmptyState message="No se encontraron docentes." cols={7} />
              ) : (
                docentes.map((d) => (
                  <TableRow
                    key={d.id}
                    className={cn(
                      "transition-colors hover:bg-muted/30",
                      !d.activo && "opacity-60"
                    )}
                  >
                    <TableCell>
                      <div>
                        <p className="font-medium">{d.nombres} {d.apellidos}</p>
                        <p className="text-xs text-muted-foreground">{d.email}</p>
                        {d.titulo && (
                          <p className="text-xs text-muted-foreground italic">{d.titulo}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm font-mono">{d.ci}</TableCell>
                    <TableCell>
                      <span className={cn(
                        "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium",
                        gradoColors[d.grado_academico]
                      )}>
                        <GraduationCap className="h-3 w-3" />
                        {d.grado_academico}
                      </span>
                    </TableCell>
                    <TableCell>
                      {d.diplomado_docencia ? (
                        <span className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
                          <BadgeCheck className="h-3.5 w-3.5" />
                          Sí
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">No</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {d.user_id ? (
                        <span className="inline-flex items-center rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-xs text-emerald-600 dark:text-emerald-400">
                          Con acceso
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">Sin cuenta</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className={cn(
                        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
                        d.activo
                          ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-400"
                          : "bg-muted text-muted-foreground border-border"
                      )}>
                        {d.activo ? "Activo" : "Inactivo"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => abrirEditar(d)}
                          className="h-8 w-8 p-0 hover:bg-primary/10 hover:text-primary"
                          title="Editar docente"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleActivo(d)}
                          className={cn(
                            "h-8 w-8 p-0",
                            d.activo
                              ? "hover:bg-destructive/10 hover:text-destructive"
                              : "hover:bg-emerald-500/10 hover:text-emerald-600"
                          )}
                          title={d.activo ? "Desactivar docente" : "Reactivar docente"}
                        >
                          {d.activo
                            ? <UserX className="h-3.5 w-3.5" />
                            : <UserCheck className="h-3.5 w-3.5" />
                          }
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </ContentCard>

      <DocenteModal
        open={modalOpen}
        docente={docenteEditar}
        onClose={() => setModalOpen(false)}
        onSaved={cargar}
      />
    </div>
  );
}
