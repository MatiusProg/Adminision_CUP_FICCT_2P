// Gestión de grupos del CUP-FICCT (UC-14 y UC-15).
// UC-14: botón "Generar Grupos" ejecuta algoritmo CEIL.
// UC-15: asignación de docentes con validación de requisitos, tope y horarios.

import { useEffect, useState } from "react";
import {
  Users, BookOpen, MapPin, Clock, Zap, Pencil,
  CheckCircle2, AlertCircle, Loader2, UserCircle, UserPlus, X,
} from "lucide-react";
import { toast } from "sonner";
import { useConfirm } from "@/context/useConfirm";
import {
  gruposService,
  type Grupo,
  type GruposPorMateria,
  type HorarioOpcion,
  type ResultadoGeneracion,
  type DocenteDisponible,
} from "@/services/gruposService";
import { PageHeader, ContentCard } from "@/components/ui-shared";
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

// ── Colores por materia ───────────────────────────────────────────────────────
const materiaColors: Record<string, string> = {
  COMP: "bg-primary/10 text-primary border-primary/20",
  MAT:  "bg-amber-500/10 text-amber-600 border-amber-500/20 dark:text-amber-400",
  ING:  "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-400",
  FIS:  "bg-purple-500/10 text-purple-600 border-purple-500/20 dark:text-purple-400",
};

// ── Modal editar aula/horario ─────────────────────────────────────────────────
function EditarHorarioModal({ open, grupo, horarios, onClose, onSaved }: {
  open: boolean; grupo: Grupo | null; horarios: HorarioOpcion[];
  onClose: () => void; onSaved: () => void;
}) {
  const [aula, setAula] = useState("");
  const [horario, setHorario] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (grupo) { setAula(grupo.aula ?? ""); setHorario(grupo.horario ?? ""); }
  }, [grupo, open]);

  async function handleSave() {
    if (!grupo) return;
    setSaving(true);
    try {
      await gruposService.actualizarHorario(grupo.id, { aula, horario });
      toast.success(`Grupo ${grupo.nombre} actualizado.`);
      onSaved(); onClose();
    } catch (err: unknown) {
      toast.error((err as { message?: string })?.message ?? "No se pudo actualizar.");
    } finally { setSaving(false); }
  }

  return (
    <Dialog open={open} onOpenChange={(v: boolean) => !v && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-heading">Editar grupo {grupo?.nombre}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-1.5">
            <Label htmlFor="g-aula">Aula</Label>
            <Input id="g-aula" value={aula} onChange={(e) => setAula(e.target.value)}
              placeholder="Ej: A-101" maxLength={20} />
          </div>
          <div className="grid gap-1.5">
            <Label>Horario</Label>
            <Select value={horario} onValueChange={setHorario}>
              <SelectTrigger><SelectValue placeholder="Seleccionar horario..." /></SelectTrigger>
              <SelectContent>
                {horarios.map((h) => (
                  <SelectItem key={h.codigo} value={h.label}>
                    <span className="font-mono text-xs mr-2 text-muted-foreground">{h.codigo}</span>
                    {h.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving || !aula || !horario}>
            {saving ? "Guardando..." : "Guardar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Modal asignar docente ─────────────────────────────────────────────────────
function AsignarDocenteModal({ open, grupo, onClose, onSaved }: {
  open: boolean; grupo: Grupo | null; onClose: () => void; onSaved: () => void;
}) {
  const [docentes, setDocentes] = useState<DocenteDisponible[]>([]);
  const [requisito, setRequisito] = useState("");
  const [loading, setLoading] = useState(false);
  const [asignando, setAsignando] = useState<number | null>(null);

  useEffect(() => {
    if (!open || !grupo) return;
    setLoading(true);
    gruposService.docentesDisponibles(grupo.id)
      .then((res) => { setDocentes(res.data); setRequisito(res.requisito); })
      .catch(() => toast.error("No se pudieron cargar los docentes disponibles."))
      .finally(() => setLoading(false));
  }, [open, grupo]);

  async function handleAsignar(docenteId: number) {
    if (!grupo) return;
    setAsignando(docenteId);
    try {
      const res = await gruposService.asignarDocente(grupo.id, docenteId);
      toast.success(res.message);
      onSaved(); onClose();
    } catch (err: unknown) {
      toast.error((err as { message?: string })?.message ?? "No se pudo asignar el docente.");
    } finally { setAsignando(null); }
  }

  return (
    <Dialog open={open} onOpenChange={(v: boolean) => !v && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-heading">
            Asignar docente — Grupo {grupo?.nombre}
          </DialogTitle>
        </DialogHeader>

        {/* Requisito de la materia */}
        {requisito && (
          <div className="flex items-start gap-2 rounded-lg bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
            <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5 text-amber-500" />
            {requisito}
          </div>
        )}

        {/* Horario del grupo */}
        {grupo?.horario && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            Horario del grupo: <strong>{grupo.horario}</strong>
            <span className="text-muted-foreground/60">— solo docentes sin conflicto en este horario</span>
          </div>
        )}

        {/* Tabla de docentes disponibles */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12 gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">Cargando docentes disponibles...</span>
            </div>
          ) : docentes.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-12 text-center text-muted-foreground">
              <AlertCircle className="h-8 w-8" />
              <p className="text-sm font-medium">No hay docentes disponibles</p>
              <p className="text-xs max-w-sm">
                Ningún docente activo cumple los requisitos de formación para esta materia,
                o todos tienen el horario ocupado o el tope de grupos alcanzado.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="font-semibold">Docente</TableHead>
                  <TableHead className="font-semibold">Título</TableHead>
                  <TableHead className="font-semibold">Grado</TableHead>
                  <TableHead className="font-semibold text-center">Grupos</TableHead>
                  <TableHead className="text-right font-semibold">Acción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {docentes.map((d) => (
                  <TableRow key={d.id} className="hover:bg-muted/30">
                    <TableCell className="font-medium">
                      {d.nombres} {d.apellidos}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{d.titulo ?? "—"}</TableCell>
                    <TableCell>
                      <span className="text-xs">{d.grado_academico}</span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className={cn(
                        "text-xs font-medium px-2 py-0.5 rounded-full",
                        d.grupos_disponibles > 0
                          ? "bg-emerald-500/10 text-emerald-600"
                          : "bg-destructive/10 text-destructive"
                      )}>
                        {d.grupos_asignados}/{d.grupos_asignados + d.grupos_disponibles}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end">
                        <Button
                          size="sm"
                          onClick={() => handleAsignar(d.id)}
                          disabled={asignando === d.id}
                          className="h-8 gap-1.5"
                        >
                          {asignando === d.id
                            ? <Loader2 className="h-3 w-3 animate-spin" />
                            : <UserPlus className="h-3 w-3" />}
                          Asignar
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cerrar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Tarjeta de grupo ──────────────────────────────────────────────────────────
function GrupoCard({ grupo, onEditarHorario, onAsignarDocente, onDesasignar }: {
  grupo: Grupo;
  onEditarHorario: (g: Grupo) => void;
  onAsignarDocente: (g: Grupo) => void;
  onDesasignar: (g: Grupo) => void;
}) {
  const ocupacion = grupo.capacidad > 0
    ? Math.round((grupo.inscritos / grupo.capacidad) * 100) : 0;

  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm hover:shadow-md transition-shadow flex flex-col gap-3">
      {/* Nombre + ocupación */}
      <div className="flex items-center justify-between">
        <span className="font-heading font-bold text-base">{grupo.nombre}</span>
        <span className={cn(
          "text-xs font-medium px-2 py-0.5 rounded-full border",
          ocupacion >= 90 ? "bg-destructive/10 text-destructive border-destructive/20"
            : ocupacion >= 70 ? "bg-amber-500/10 text-amber-600 border-amber-500/20"
            : "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
        )}>
          {grupo.inscritos}/{grupo.capacidad}
        </span>
      </div>

      {/* Barra de ocupación */}
      <div className="h-1.5 w-full rounded-full bg-muted">
        <div className={cn("h-1.5 rounded-full transition-all",
          ocupacion >= 90 ? "bg-destructive" : ocupacion >= 70 ? "bg-amber-500" : "bg-emerald-500"
        )} style={{ width: `${Math.min(ocupacion, 100)}%` }} />
      </div>

      {/* Aula y horario */}
      <div className="space-y-1 text-sm text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <MapPin className="h-3.5 w-3.5 shrink-0" />
          <span>{grupo.aula ?? "Sin aula"}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5 shrink-0" />
          <span className="text-xs">{grupo.horario ?? "Sin horario"}</span>
        </div>
      </div>

      {/* Docente */}
      <div className="border-t border-border/50 pt-2">
        {grupo.docente ? (
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start gap-1.5 text-sm min-w-0">
              <UserCircle className="h-3.5 w-3.5 shrink-0 mt-0.5 text-emerald-500" />
              <div className="min-w-0">
                <p className="font-medium text-foreground text-xs truncate">
                  {grupo.docente.nombres} {grupo.docente.apellidos}
                </p>
                {grupo.docente.titulo && (
                  <p className="text-[11px] text-muted-foreground truncate">{grupo.docente.titulo}</p>
                )}
              </div>
            </div>
            <button onClick={() => onDesasignar(grupo)}
              className="text-muted-foreground/50 hover:text-destructive transition-colors shrink-0"
              title="Desasignar docente">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground/60 italic flex items-center gap-1">
            <UserCircle className="h-3.5 w-3.5" /> Sin docente asignado
          </p>
        )}
      </div>

      {/* Acciones */}
      <div className="flex gap-2 mt-auto">
        <Button variant="ghost" size="sm" onClick={() => onEditarHorario(grupo)}
          className="flex-1 h-8 text-xs hover:bg-primary/10 hover:text-primary">
          <Pencil className="h-3 w-3 mr-1" /> Aula/Horario
        </Button>
        <Button variant="ghost" size="sm" onClick={() => onAsignarDocente(grupo)}
          className="flex-1 h-8 text-xs hover:bg-emerald-500/10 hover:text-emerald-600">
          <UserPlus className="h-3 w-3 mr-1" />
          {grupo.docente ? "Cambiar" : "Asignar"}
        </Button>
      </div>
    </div>
  );
}

// ── Banner resultado generación ───────────────────────────────────────────────
function ResultadoBanner({ resultado }: { resultado: ResultadoGeneracion }) {
  return (
    <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
      <div className="flex items-start gap-3">
        <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-sm text-emerald-700 dark:text-emerald-400">
            Grupos generados correctamente
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {resultado.total_postulantes} postulantes →{" "}
            <strong>CEIL({resultado.total_postulantes} / {resultado.max_alumnos_grupo}) = {resultado.num_grupos} grupos</strong>{" "}
            por materia · {resultado.total_grupos} grupos totales ·{" "}
            {resultado.total_inscripciones} inscripciones · {resultado.total_examenes} exámenes creados
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────
export function GruposPage() {
  const confirm = useConfirm();
  const [porMateria, setPorMateria] = useState<GruposPorMateria[]>([]);
  const [gestion, setGestion] = useState<{ codigo: string; estado: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [generando, setGenerando] = useState(false);
  const [horarios, setHorarios] = useState<HorarioOpcion[]>([]);
  const [resultado, setResultado] = useState<ResultadoGeneracion | null>(null);
  const [grupoHorario, setGrupoHorario] = useState<Grupo | null>(null);
  const [grupoDocente, setGrupoDocente] = useState<Grupo | null>(null);
  const [modalHorarioOpen, setModalHorarioOpen] = useState(false);
  const [modalDocenteOpen, setModalDocenteOpen] = useState(false);

  async function cargar() {
    setLoading(true);
    try {
      const [resGrupos, resHorarios] = await Promise.all([
        gruposService.list(), gruposService.horarios(),
      ]);
      setPorMateria(resGrupos.data);
      setGestion(resGrupos.gestion);
      setHorarios(resHorarios.data);
    } catch {
      toast.error("No se pudieron cargar los grupos.");
    } finally { setLoading(false); }
  }

  useEffect(() => { cargar(); }, []);

  async function handleGenerar() {
    const ok = await confirm({
      title: "Generar grupos automáticamente",
      description: "Se calcularán los grupos usando CEIL(postulantes / máximo por grupo). " +
        "Cada postulante confirmado quedará inscrito en 4 grupos (uno por materia). ¿Confirmar?",
      confirmText: "Generar grupos",
    });
    if (!ok) return;
    setGenerando(true);
    try {
      const res = await gruposService.generar();
      setResultado(res.data);
      toast.success(res.message);
      cargar();
    } catch (err: unknown) {
      toast.error((err as { message?: string })?.message ?? "No se pudieron generar los grupos.");
    } finally { setGenerando(false); }
  }

  async function handleDesasignar(grupo: Grupo) {
    const ok = await confirm({
      title: "Desasignar docente",
      description: `¿Desasignar al docente del grupo ${grupo.nombre}?`,
      confirmText: "Desasignar",
      destructive: true,
    });
    if (!ok) return;
    try {
      await gruposService.desasignarDocente(grupo.id);
      toast.success(`Docente desasignado del grupo ${grupo.nombre}.`);
      cargar();
    } catch (err: unknown) {
      toast.error((err as { message?: string })?.message ?? "No se pudo desasignar.");
    }
  }

  const hayGrupos   = porMateria.length > 0;
  const fasePermite = gestion?.estado === "cup_iniciado";

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <PageHeader title="Grupos" description="Grupos generados para la gestión activa." />
        <div className="flex items-center justify-center py-24 gap-3 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm">Cargando grupos...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Grupos"
        description={`Grupos de la gestión ${gestion?.codigo ?? "—"} organizados por materia.`}
      >
        {!hayGrupos && (
          <Button onClick={handleGenerar} disabled={generando || !fasePermite} className="gap-2"
            title={!fasePermite ? "La gestión debe estar en fase 'CUP Iniciado'" : ""}>
            {generando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
            {generando ? "Generando..." : "Generar grupos automáticamente"}
          </Button>
        )}
      </PageHeader>

      {/* Aviso de fase */}
      {!hayGrupos && !fasePermite && gestion && (
        <ContentCard className="p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-sm">Fase insuficiente</p>
              <p className="text-xs text-muted-foreground mt-1">
                La gestión <strong>{gestion.codigo}</strong> debe estar en fase{" "}
                <strong>CUP Iniciado</strong> para generar grupos.
                Fase actual: <strong>{gestion.estado}</strong>.
              </p>
            </div>
          </div>
        </ContentCard>
      )}

      {resultado && <ResultadoBanner resultado={resultado} />}

      {!hayGrupos && fasePermite && (
        <ContentCard className="p-12">
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="rounded-full bg-muted p-5">
              <Users className="h-10 w-10 text-muted-foreground" />
            </div>
            <p className="font-heading font-semibold">No hay grupos generados</p>
            <p className="text-sm text-muted-foreground max-w-sm">
              Presiona "Generar grupos automáticamente" para calcular los grupos.
            </p>
          </div>
        </ContentCard>
      )}

      {hayGrupos && (
        <div className="space-y-8">
          {porMateria.map((seccion) => (
            <div key={seccion.materia_codigo}>
              <div className="flex items-center gap-3 mb-4">
                <span className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-bold",
                  materiaColors[seccion.materia_codigo] ?? "bg-muted text-muted-foreground border-border"
                )}>
                  <BookOpen className="h-3.5 w-3.5" />
                  {seccion.materia_codigo}
                </span>
                <h2 className="font-heading font-semibold text-lg">{seccion.materia_nombre}</h2>
                <span className="text-sm text-muted-foreground">({seccion.grupos.length} grupos)</span>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {seccion.grupos.map((grupo) => (
                  <GrupoCard
                    key={grupo.id}
                    grupo={grupo}
                    onEditarHorario={(g) => { setGrupoHorario(g); setModalHorarioOpen(true); }}
                    onAsignarDocente={(g) => { setGrupoDocente(g); setModalDocenteOpen(true); }}
                    onDesasignar={handleDesasignar}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <EditarHorarioModal
        open={modalHorarioOpen} grupo={grupoHorario} horarios={horarios}
        onClose={() => setModalHorarioOpen(false)} onSaved={cargar}
      />
      <AsignarDocenteModal
        open={modalDocenteOpen} grupo={grupoDocente}
        onClose={() => setModalDocenteOpen(false)} onSaved={cargar}
      />
    </div>
  );
}