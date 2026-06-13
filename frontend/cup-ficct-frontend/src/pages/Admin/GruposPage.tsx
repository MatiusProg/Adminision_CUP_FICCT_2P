// Gestión de grupos del CUP-FICCT (UC-14 y UC-15 parcial).
// Muestra los grupos organizados por materia con sus docentes asignados.
// El botón "Generar Grupos" ejecuta el algoritmo CEIL automáticamente.
// Permite editar aula y horario de cada grupo individualmente.

import { useEffect, useState } from "react";
import {
  Users, BookOpen, MapPin, Clock, Zap, Pencil,
  CheckCircle2, AlertCircle, Loader2, UserCircle,
} from "lucide-react";
import { toast } from "sonner";
import { useConfirm } from "@/context/useConfirm";
import {
  gruposService,
  type Grupo,
  type GruposPorMateria,
  type HorarioOpcion,
  type ResultadoGeneracion,
} from "@/services/gruposService";
import { PageHeader, ContentCard } from "@/components/ui-shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { cn } from "@/lib/utils";

// ── Colores por materia ───────────────────────────────────────────────────────
const materiaColors: Record<string, string> = {
  COMP: "bg-primary/10 text-primary border-primary/20",
  MAT:  "bg-amber-500/10 text-amber-600 border-amber-500/20 dark:text-amber-400",
  ING:  "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-400",
  FIS:  "bg-purple-500/10 text-purple-600 border-purple-500/20 dark:text-purple-400",
};

// ── Tarjeta de un grupo individual ───────────────────────────────────────────
function GrupoCard({
  grupo,
  onEditar,
}: {
  grupo: Grupo;
  onEditar: (grupo: Grupo) => void;
}) {
  const ocupacion = grupo.capacidad > 0
    ? Math.round((grupo.inscritos / grupo.capacidad) * 100)
    : 0;

  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm hover:shadow-md transition-shadow">
      {/* Encabezado: nombre del grupo + badge de ocupación */}
      <div className="flex items-center justify-between mb-3">
        <span className="font-heading font-bold text-base">{grupo.nombre}</span>
        <span className={cn(
          "text-xs font-medium px-2 py-0.5 rounded-full border",
          ocupacion >= 90
            ? "bg-destructive/10 text-destructive border-destructive/20"
            : ocupacion >= 70
            ? "bg-amber-500/10 text-amber-600 border-amber-500/20"
            : "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
        )}>
          {grupo.inscritos}/{grupo.capacidad}
        </span>
      </div>

      {/* Barra de ocupación */}
      <div className="h-1.5 w-full rounded-full bg-muted mb-3">
        <div
          className={cn(
            "h-1.5 rounded-full transition-all",
            ocupacion >= 90 ? "bg-destructive" : ocupacion >= 70 ? "bg-amber-500" : "bg-emerald-500"
          )}
          style={{ width: `${Math.min(ocupacion, 100)}%` }}
        />
      </div>

      {/* Datos logísticos */}
      <div className="space-y-1.5 text-sm text-muted-foreground mb-3">
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
      <div className="border-t border-border/50 pt-3">
        {grupo.docente ? (
          <div className="flex items-start gap-1.5 text-sm">
            <UserCircle className="h-3.5 w-3.5 shrink-0 mt-0.5 text-muted-foreground" />
            <div>
              <p className="font-medium text-foreground text-xs">
                {grupo.docente.nombres} {grupo.docente.apellidos}
              </p>
              {grupo.docente.titulo && (
                <p className="text-[11px] text-muted-foreground">{grupo.docente.titulo}</p>
              )}
            </div>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground/60 italic flex items-center gap-1">
            <UserCircle className="h-3.5 w-3.5" />
            Sin docente asignado
          </p>
        )}
      </div>

      {/* Botón editar horario/aula */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onEditar(grupo)}
        className="mt-3 w-full h-8 text-xs hover:bg-primary/10 hover:text-primary"
      >
        <Pencil className="h-3 w-3 mr-1" />
        Editar aula y horario
      </Button>
    </div>
  );
}

// ── Modal de edición de aula/horario ─────────────────────────────────────────
function EditarHorarioModal({
  open,
  grupo,
  horarios,
  onClose,
  onSaved,
}: {
  open: boolean;
  grupo: Grupo | null;
  horarios: HorarioOpcion[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [aula, setAula] = useState("");
  const [horario, setHorario] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (grupo) {
      setAula(grupo.aula ?? "");
      setHorario(grupo.horario ?? "");
    }
  }, [grupo, open]);

  async function handleSave() {
    if (!grupo) return;
    setSaving(true);
    try {
      await gruposService.actualizarHorario(grupo.id, { aula, horario });
      toast.success(`Grupo ${grupo.nombre} actualizado.`);
      onSaved();
      onClose();
    } catch (err: unknown) {
      const e = err as { message?: string };
      toast.error(e?.message ?? "No se pudo actualizar el grupo.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v: boolean) => !v && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-heading">
            Editar grupo {grupo?.nombre}
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid gap-1.5">
            <Label htmlFor="g-aula">Aula</Label>
            <Input
              id="g-aula"
              value={aula}
              onChange={(e) => setAula(e.target.value)}
              placeholder="Ej: A-101"
              maxLength={20}
            />
          </div>

          <div className="grid gap-1.5">
            <Label>Horario</Label>
            <Select value={horario} onValueChange={setHorario}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar horario..." />
              </SelectTrigger>
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

// ── Banner de resultado de generación ────────────────────────────────────────
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
  const [grupoEditar, setGrupoEditar] = useState<Grupo | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  async function cargar() {
    setLoading(true);
    try {
      const [resGrupos, resHorarios] = await Promise.all([
        gruposService.list(),
        gruposService.horarios(),
      ]);
      setPorMateria(resGrupos.data);
      setGestion(resGrupos.gestion);
      setHorarios(resHorarios.data);
    } catch {
      toast.error("No se pudieron cargar los grupos.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { cargar(); }, []);

  async function handleGenerar() {
    const ok = await confirm({
      title: "Generar grupos automáticamente",
      description:
        "Se calcularán los grupos usando CEIL(postulantes / máximo por grupo). " +
        "Cada postulante confirmado quedará inscrito en 4 grupos (uno por materia). " +
        "Esta acción no se puede deshacer fácilmente. ¿Confirmar?",
      confirmText: "Generar grupos",
      destructive: false,
    });
    if (!ok) return;

    setGenerando(true);
    try {
      const res = await gruposService.generar();
      setResultado(res.data);
      toast.success(res.message);
      cargar();
    } catch (err: unknown) {
      const e = err as { message?: string };
      toast.error(e?.message ?? "No se pudieron generar los grupos.");
    } finally {
      setGenerando(false);
    }
  }

  function abrirEditar(grupo: Grupo) {
    setGrupoEditar(grupo);
    setModalOpen(true);
  }

  const hayGrupos = porMateria.length > 0;
  const fasePermite = gestion?.estado === "cup_iniciado";

  // ── Estado de carga ──────────────────────────────────────────────────────
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
        {/* Botón de generación — solo si no hay grupos y la fase lo permite */}
        {!hayGrupos && (
          <Button
            onClick={handleGenerar}
            disabled={generando || !fasePermite}
            className="gap-2"
            title={!fasePermite ? "La gestión debe estar en fase 'CUP Iniciado'" : ""}
          >
            {generando ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Zap className="h-4 w-4" />
            )}
            {generando ? "Generando..." : "Generar grupos automáticamente"}
          </Button>
        )}
      </PageHeader>

      {/* Aviso de fase insuficiente */}
      {!hayGrupos && !fasePermite && gestion && (
        <ContentCard className="p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-sm">Fase insuficiente</p>
              <p className="text-xs text-muted-foreground mt-1">
                La gestión <strong>{gestion.codigo}</strong> debe estar en fase{" "}
                <strong>CUP Iniciado</strong> para generar grupos. Fase actual:{" "}
                <strong>{gestion.estado}</strong>. Avance la fase desde la página de Gestiones.
              </p>
            </div>
          </div>
        </ContentCard>
      )}

      {/* Banner de resultado de generación */}
      {resultado && <ResultadoBanner resultado={resultado} />}

      {/* Grupos sin generar */}
      {!loading && !hayGrupos && fasePermite && (
        <ContentCard className="p-12">
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="rounded-full bg-muted p-5">
              <Users className="h-10 w-10 text-muted-foreground" />
            </div>
            <p className="font-heading font-semibold">No hay grupos generados</p>
            <p className="text-sm text-muted-foreground max-w-sm">
              Presiona "Generar grupos automáticamente" para calcular los grupos
              usando la fórmula CEIL(postulantes / máximo por grupo).
            </p>
          </div>
        </ContentCard>
      )}

      {/* Grilla de grupos por materia */}
      {hayGrupos && (
        <div className="space-y-8">
          {porMateria.map((seccion) => (
            <div key={seccion.materia_codigo}>
              {/* Encabezado de materia */}
              <div className="flex items-center gap-3 mb-4">
                <span className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-bold",
                  materiaColors[seccion.materia_codigo] ?? "bg-muted text-muted-foreground border-border"
                )}>
                  <BookOpen className="h-3.5 w-3.5" />
                  {seccion.materia_codigo}
                </span>
                <h2 className="font-heading font-semibold text-lg">{seccion.materia_nombre}</h2>
                <span className="text-sm text-muted-foreground">
                  ({seccion.grupos.length} grupos)
                </span>
              </div>

              {/* Grilla de tarjetas — responsive */}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {seccion.grupos.map((grupo) => (
                  <GrupoCard
                    key={grupo.id}
                    grupo={grupo}
                    onEditar={abrirEditar}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal editar aula/horario */}
      <EditarHorarioModal
        open={modalOpen}
        grupo={grupoEditar}
        horarios={horarios}
        onClose={() => setModalOpen(false)}
        onSaved={cargar}
      />
    </div>
  );
}
