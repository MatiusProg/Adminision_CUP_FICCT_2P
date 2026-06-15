// Gestión de usuarios internos del sistema (UC-02).
// Roles: admin, coordinador_academico, autoridad.
// Los docentes se gestionan desde /docentes con su perfil completo.

import { useEffect, useState } from "react";
import { Plus, Search, Pencil, UserX, UserCheck, Eye, EyeOff, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { useConfirm } from "@/context/useConfirm";
import {
  usuariosService,
  type Usuario,
  type UsuarioInput,
  type RolInterno,
} from "@/services/usuariosService";
import { PageHeader, ContentCard, SkeletonRows, EmptyState } from "@/components/ui-shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

// Docente excluido — se gestiona desde /docentes.
const rolLabels: Record<RolInterno, string> = {
  admin: "Administrador",
  coordinador_academico: "Coordinador Académico",
  autoridad: "Autoridad",
};

const rolColors: Record<RolInterno, string> = {
  admin: "bg-primary/10 text-primary border-primary/20",
  coordinador_academico: "bg-amber-500/10 text-amber-600 border-amber-500/20 dark:text-amber-400",
  autoridad: "bg-purple-500/10 text-purple-600 border-purple-500/20 dark:text-purple-400",
};

const formVacio: UsuarioInput & { id?: number } = {
  name: "", email: "", password: "", rol: "coordinador_academico",
};


// ── Modal crear/editar ────────────────────────────────────────────────────────
function UsuarioModal({ open, usuario, onClose, onSaved }: {
  open: boolean; usuario: Usuario | null; onClose: () => void; onSaved: () => void;
}) {
  const [form, setForm] = useState(formVacio);
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (usuario) {
      setForm({ id: usuario.id, name: usuario.name, email: usuario.email, password: "", rol: usuario.rol });
    } else {
      setForm(formVacio);
    }
    setErrors({});
    setShowPassword(false);
  }, [usuario, open]);

  const esEdicion = Boolean(usuario);

  function set(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
    setErrors((e) => ({ ...e, [field]: "" }));
  }

  async function handleSave() {
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = "El nombre es obligatorio.";
    if (!form.email.trim()) errs.email = "El correo es obligatorio.";
    if (!esEdicion && !form.password) errs.password = "La contraseña es obligatoria.";
    if (form.password && form.password.length < 8) errs.password = "Mínimo 8 caracteres.";
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setSaving(true);
    try {
      if (esEdicion && usuario) {
        const payload: Record<string, string> = { name: form.name, email: form.email, rol: form.rol };
        if (form.password) payload.password = form.password;
        await usuariosService.update(usuario.id, payload);
        toast.success("Usuario actualizado correctamente.");
      } else {
        await usuariosService.create({ name: form.name, email: form.email, password: form.password, rol: form.rol as RolInterno });
        toast.success("Usuario creado correctamente.");
      }
      onSaved(); onClose();
    } catch (err: unknown) {
      const e = err as { errors?: Record<string, string[]>; message?: string };
      if (e?.errors) {
        const mapped: Record<string, string> = {};
        Object.entries(e.errors).forEach(([k, v]) => { mapped[k] = v[0]; });
        setErrors(mapped);
      } else {
        toast.error(e?.message ?? "No se pudo guardar el usuario.");
      }
    } finally { setSaving(false); }
  }

  return (
    <Dialog open={open} onOpenChange={(v: boolean) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading">{esEdicion ? "Editar usuario" : "Nuevo usuario"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-1.5">
            <Label htmlFor="u-name">Nombre completo</Label>
            <Input id="u-name" value={form.name} onChange={(e) => set("name", e.target.value)}
              placeholder="Ej: María López" className={errors.name ? "border-destructive" : ""} />
            {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="u-email">Correo electrónico</Label>
            <Input id="u-email" type="email" value={form.email} onChange={(e) => set("email", e.target.value)}
              placeholder="usuario@ficct.uagrm.edu.bo" className={errors.email ? "border-destructive" : ""} />
            {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="u-password">
              {esEdicion ? "Nueva contraseña (dejar vacío para no cambiar)" : "Contraseña"}
            </Label>
            <div className="relative">
              <Input id="u-password" type={showPassword ? "text" : "password"} value={form.password}
                onChange={(e) => set("password", e.target.value)}
                placeholder={esEdicion ? "••••••••" : "Mínimo 8 caracteres"}
                className={cn("pr-10", errors.password ? "border-destructive" : "")} />
              <button type="button" onClick={() => setShowPassword((v) => !v)} tabIndex={-1}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}>
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
          </div>
          <div className="grid gap-1.5">
            <Label>Rol</Label>
            <Select value={form.rol} onValueChange={(v) => set("rol", v)}>
              <SelectTrigger className={errors.rol ? "border-destructive" : ""}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(rolLabels).map(([v, l]) => (
                  <SelectItem key={v} value={v}>{l}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Los docentes se registran desde la sección <strong>Docentes</strong>.
            </p>
            {errors.rol && <p className="text-xs text-destructive">{errors.rol}</p>}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Guardando..." : esEdicion ? "Guardar cambios" : "Crear usuario"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────
export function UsuariosPage() {
  const confirm = useConfirm();
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filtroRol, setFiltroRol] = useState("todos");
  const [filtroActivo, setFiltroActivo] = useState("todos");
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [usuarioEditar, setUsuarioEditar] = useState<Usuario | null>(null);

  async function cargar(p: number = page) {
    setLoading(true);
    try {
      const params: Record<string, string | boolean | number> = { page: p };
      if (search) params.search = search;
      if (filtroRol !== "todos") params.rol = filtroRol;
      if (filtroActivo !== "todos") params.activo = filtroActivo === "activo";
      const res = await usuariosService.list(params as Parameters<typeof usuariosService.list>[0]);
      setUsuarios(res.data);
      setLastPage(res.meta?.last_page ?? 1);
      setTotal(res.meta?.total ?? res.data.length);
      setPage(res.meta?.current_page ?? p);
    } catch {
      toast.error("No se pudieron cargar los usuarios.");
    } finally { setLoading(false); }
  }

  useEffect(() => { cargar(1); }, [filtroRol, filtroActivo]);

  function abrirCrear() { setUsuarioEditar(null); setModalOpen(true); }
  function abrirEditar(u: Usuario) { setUsuarioEditar(u); setModalOpen(true); }

  async function toggleActivo(u: Usuario) {
    const accion = u.activo ? "desactivar" : "reactivar";
    const verbo = u.activo ? "Desactivar" : "Reactivar";
    const ok = await confirm({
      title: `${verbo} usuario`,
      description: `¿Está seguro de ${accion} a ${u.name}?${u.activo ? " Perderá acceso al sistema." : ""}`,
      confirmText: verbo,
      destructive: u.activo,
    });
    if (!ok) return;
    try {
      if (u.activo) {
        await usuariosService.desactivar(u.id);
        toast.success(`Usuario ${u.name} desactivado.`);
      } else {
        await usuariosService.reactivar(u.id);
        toast.success(`Usuario ${u.name} reactivado.`);
      }
      cargar();
    } catch (err: unknown) {
      toast.error((err as { message?: string })?.message ?? "No se pudo realizar la operación.");
    }
  }

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Usuarios del sistema"
        description={total > 0 ? `${total} usuario${total === 1 ? "" : "s"} registrados` : "Administradores, coordinadores y autoridades."}
      >
        <Button onClick={abrirCrear} className="gap-2">
          <Plus className="h-4 w-4" /> Nuevo usuario
        </Button>
      </PageHeader>

      {/* Filtros */}
      <ContentCard className="p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Buscar por nombre o correo..." value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && cargar(1)}
              className="pl-9" />
          </div>
          <Select value={filtroRol} onValueChange={setFiltroRol}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="Todos los roles" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos los roles</SelectItem>
              {Object.entries(rolLabels).map(([v, l]) => (
                <SelectItem key={v} value={v}>{l}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filtroActivo} onValueChange={setFiltroActivo}>
            <SelectTrigger className="w-[150px]"><SelectValue placeholder="Estado" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="activo">Activos</SelectItem>
              <SelectItem value="inactivo">Inactivos</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => cargar(1)}>Buscar</Button>
        </div>
      </ContentCard>

      {/* Tabla */}
      <ContentCard>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="font-semibold">Nombre</TableHead>
                <TableHead className="font-semibold">Correo</TableHead>
                <TableHead className="font-semibold">Rol</TableHead>
                <TableHead className="font-semibold">Estado</TableHead>
                <TableHead className="text-right font-semibold">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <SkeletonRows rows={5} cols={5} />
              ) : usuarios.length === 0 ? (
                <EmptyState message="No se encontraron usuarios." cols={5} />
              ) : (
                usuarios.map((u) => (
                  <TableRow key={u.id} className={cn("transition-colors hover:bg-muted/30", !u.activo && "opacity-60")}>
                    <TableCell className="font-medium">{u.name}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{u.email}</TableCell>
                    <TableCell>
                      <span className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
                        rolColors[u.rol] ?? "bg-muted text-muted-foreground border-border")}>
                        {rolLabels[u.rol] ?? u.rol}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
                        u.activo ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-400"
                          : "bg-muted text-muted-foreground border-border")}>
                        {u.activo ? "Activo" : "Inactivo"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={() => abrirEditar(u)}
                          className="h-8 w-8 p-0 hover:bg-primary/10 hover:text-primary" title="Editar">
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => toggleActivo(u)}
                          className={cn("h-8 w-8 p-0", u.activo
                            ? "hover:bg-destructive/10 hover:text-destructive"
                            : "hover:bg-emerald-500/10 hover:text-emerald-600")}
                          title={u.activo ? "Desactivar" : "Reactivar"}>
                          {u.activo ? <UserX className="h-3.5 w-3.5" /> : <UserCheck className="h-3.5 w-3.5" />}
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

      {/* Paginación */}
      {!loading && total > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            Página <span className="font-medium text-foreground">{page}</span> de{" "}
            <span className="font-medium text-foreground">{lastPage}</span> · {total} usuario{total === 1 ? "" : "s"}
          </p>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" className="h-8 w-8"
              disabled={page <= 1} onClick={() => cargar(page - 1)} title="Página anterior">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="min-w-[2.5rem] text-center text-sm font-medium">{page}</span>
            <Button variant="outline" size="icon" className="h-8 w-8"
              disabled={page >= lastPage} onClick={() => cargar(page + 1)} title="Página siguiente">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <UsuarioModal open={modalOpen} usuario={usuarioEditar}
        onClose={() => setModalOpen(false)} onSaved={cargar} />
    </div>
  );
}