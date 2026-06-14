// Portal del docente — Mis Grupos (UC-17).
// El docente ve sus grupos asignados, los postulantes inscritos y sus notas.
// Vista de solo lectura — el registro de notas lo hace el coordinador (UC-12).

import { useEffect, useState } from "react";
import {
  BookOpen, MapPin, Clock, Users, ArrowLeft,
  Loader2, AlertCircle, CheckCircle2, XCircle, UserCircle,
} from "lucide-react";
import { toast } from "sonner";
import {
  misGruposService,
  type GrupoDocente,
  type DetalleGrupoResponse,
} from "@/services/misGruposService";
import { PageHeader, ContentCard, EstadoBadge } from "@/components/ui-shared";
import { Button } from "@/components/ui/button";
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

// ── Helper ────────────────────────────────────────────────────────────────────
function fmtNota(v: number | string | null): string {
  if (v === null || v === undefined) return "—";
  return Number(v).toFixed(2);
}

// ── Tarjeta de grupo ──────────────────────────────────────────────────────────
function GrupoCard({ grupo, onVerDetalle }: {
  grupo: GrupoDocente;
  onVerDetalle: (g: GrupoDocente) => void;
}) {
  const ocupacion = grupo.capacidad > 0
    ? Math.round((grupo.inscritos / grupo.capacidad) * 100) : 0;

  return (
    <div className="rounded-xl border bg-card p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col gap-3">
      {/* Encabezado */}
      <div className="flex items-center justify-between">
        <span className={cn(
          "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold",
          materiaColors[grupo.materia.codigo] ?? "bg-muted border-border"
        )}>
          <BookOpen className="h-3 w-3" />{grupo.materia.codigo}
        </span>
        <span className="font-heading font-bold text-base">{grupo.nombre}</span>
      </div>

      <p className="font-semibold text-sm">{grupo.materia.nombre}</p>

      {/* Barra de ocupación */}
      <div className="space-y-1">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{grupo.inscritos} inscritos</span>
          <span>{ocupacion}%</span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-muted">
          <div className={cn("h-1.5 rounded-full transition-all",
            ocupacion >= 90 ? "bg-destructive" : ocupacion >= 70 ? "bg-amber-500" : "bg-emerald-500"
          )} style={{ width: `${Math.min(ocupacion, 100)}%` }} />
        </div>
      </div>

      {/* Datos logísticos */}
      <div className="space-y-1.5 text-sm text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <MapPin className="h-3.5 w-3.5 shrink-0" />
          <span>{grupo.aula}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5 shrink-0" />
          <span className="text-xs">{grupo.horario}</span>
        </div>
      </div>

      {/* Botón ver detalle */}
      <Button onClick={() => onVerDetalle(grupo)} className="mt-auto w-full gap-2">
        <Users className="h-4 w-4" />
        Ver postulantes y notas
      </Button>
    </div>
  );
}

// ── Vista detalle de un grupo ─────────────────────────────────────────────────
function DetalleGrupo({ grupoId, onVolver }: {
  grupoId: number;
  onVolver: () => void;
}) {
  const [datos, setDatos] = useState<DetalleGrupoResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    misGruposService.show(grupoId)
      .then(setDatos)
      .catch(() => toast.error("No se pudo cargar el detalle del grupo."))
      .finally(() => setLoading(false));
  }, [grupoId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 gap-3 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span className="text-sm">Cargando grupo...</span>
      </div>
    );
  }

  if (!datos) return null;

  const aprobados  = datos.data.filter((p) => p.promedio !== null && Number(p.promedio) >= 60).length;
  const reprobados = datos.data.filter((p) => p.promedio !== null && Number(p.promedio) < 60).length;
  const pendientes = datos.data.filter((p) => !p.notas_completas).length;

  return (
    <div className="space-y-6">
      {/* Header con botón volver */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={onVolver} className="gap-1.5">
          <ArrowLeft className="h-4 w-4" /> Mis grupos
        </Button>
        <div className="flex items-center gap-3">
          <span className={cn(
            "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-bold",
            materiaColors[datos.materia.codigo] ?? "bg-muted border-border"
          )}>
            <BookOpen className="h-3.5 w-3.5" />{datos.materia.codigo}
          </span>
          <div>
            <h2 className="font-heading font-bold text-lg">{datos.grupo.nombre}</h2>
            <p className="text-xs text-muted-foreground">{datos.materia.nombre}</p>
          </div>
        </div>
      </div>

      {/* Info del grupo */}
      <div className="grid gap-3 sm:grid-cols-3">
        <ContentCard className="p-4">
          <div className="flex items-center gap-2 text-sm">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Aula</p>
              <p className="font-medium">{datos.grupo.aula}</p>
            </div>
          </div>
        </ContentCard>
        <ContentCard className="p-4">
          <div className="flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Horario</p>
              <p className="font-medium text-xs">{datos.grupo.horario}</p>
            </div>
          </div>
        </ContentCard>
        <ContentCard className="p-4">
          <div className="flex items-center gap-2 text-sm">
            <Users className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Inscritos</p>
              <p className="font-medium">{datos.grupo.inscritos} / {datos.grupo.capacidad}</p>
            </div>
          </div>
        </ContentCard>
      </div>

      {/* KPIs de notas */}
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border bg-emerald-500/5 border-emerald-500/20 p-4 text-center">
          <p className="font-heading text-2xl font-bold text-emerald-600 dark:text-emerald-400">{aprobados}</p>
          <p className="text-xs text-muted-foreground mt-1">Aprobados</p>
        </div>
        <div className="rounded-xl border bg-destructive/5 border-destructive/20 p-4 text-center">
          <p className="font-heading text-2xl font-bold text-destructive">{reprobados}</p>
          <p className="text-xs text-muted-foreground mt-1">Reprobados</p>
        </div>
        <div className="rounded-xl border bg-muted/50 p-4 text-center">
          <p className="font-heading text-2xl font-bold text-muted-foreground">{pendientes}</p>
          <p className="text-xs text-muted-foreground mt-1">Pendientes</p>
        </div>
      </div>

      {/* Nota de solo lectura */}
      <div className="flex items-start gap-2 rounded-lg bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
        <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5 text-amber-500" />
        Las notas son de solo lectura. El registro de calificaciones lo realiza el coordinador académico.
      </div>

      {/* Tabla de postulantes con notas */}
      <ContentCard>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="font-semibold">CI</TableHead>
                <TableHead className="font-semibold">Apellidos</TableHead>
                <TableHead className="font-semibold">Nombres</TableHead>
                {datos.examenes.map((e) => (
                  <TableHead key={e.id} className="font-semibold text-center">
                    Ex. {e.numero} ({e.peso}%)
                  </TableHead>
                ))}
                <TableHead className="font-semibold text-center">Promedio</TableHead>
                <TableHead className="font-semibold">Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {datos.data.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-sm text-muted-foreground">
                    No hay postulantes inscritos en este grupo.
                  </td>
                </tr>
              ) : (
                datos.data.map((p) => (
                  <TableRow key={p.postulante_id} className="hover:bg-muted/30">
                    <TableCell className="font-mono text-sm">{p.ci}</TableCell>
                    <TableCell className="font-medium">{p.apellidos}</TableCell>
                    <TableCell>{p.nombres}</TableCell>
                    {p.notas.map((nota) => (
                      <TableCell key={nota.examen_id} className="text-center">
                        <span className={cn(
                          "font-heading font-semibold text-sm",
                          nota.calificacion === null ? "text-muted-foreground/40"
                            : Number(nota.calificacion) >= 60 ? "text-emerald-600 dark:text-emerald-400"
                            : "text-destructive"
                        )}>
                          {fmtNota(nota.calificacion)}
                        </span>
                      </TableCell>
                    ))}
                    <TableCell className="text-center">
                      {p.promedio !== null ? (
                        <div className="flex items-center justify-center gap-1">
                          {Number(p.promedio) >= 60
                            ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                            : <XCircle className="h-3.5 w-3.5 text-destructive" />}
                          <span className={cn(
                            "font-heading font-bold text-sm",
                            Number(p.promedio) >= 60
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-destructive"
                          )}>
                            {Number(p.promedio).toFixed(2)}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell><EstadoBadge estado={p.estado} /></TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </ContentCard>

      {/* Fórmula visible para la defensa */}
      <p className="text-xs text-muted-foreground text-center">
        Promedio ponderado: Examen 1 ({datos.pesos[1]}%) + Examen 2 ({datos.pesos[2]}%) + Examen 3 ({datos.pesos[3]}%) · Mínimo aprobatorio: 60 puntos
      </p>
    </div>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────
export function MisGruposPage() {
  const [grupos, setGrupos] = useState<GrupoDocente[]>([]);
  const [docente, setDocente] = useState<{ nombres: string; apellidos: string; titulo: string | null } | null>(null);
  const [gestion, setGestion] = useState<{ codigo: string; estado: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [aviso, setAviso] = useState<string | null>(null);
  // null = lista, number = detalle del grupo con ese id
  const [grupoSeleccionado, setGrupoSeleccionado] = useState<number | null>(null);

  useEffect(() => {
    setLoading(true);
    misGruposService.list()
      .then((res) => {
        setGrupos(res.data);
        setDocente(res.docente);
        setGestion(res.gestion);
        setAviso(null);
      })
      .catch(async (err) => {
        try {
          const body = await err.response?.json();
          setAviso(body?.message ?? "No se pudieron cargar los grupos.");
        } catch {
          setAviso("No se pudieron cargar los grupos.");
        }
      })
      .finally(() => setLoading(false));
  }, []);

  // ── Carga ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <PageHeader title="Mis grupos" description="Grupos asignados en la gestión activa." />
        <div className="flex items-center justify-center py-24 gap-3 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm">Cargando grupos...</span>
        </div>
      </div>
    );
  }

  // ── Vista detalle ─────────────────────────────────────────────────────────
  if (grupoSeleccionado !== null) {
    return (
      <div className="p-6">
        <DetalleGrupo
          grupoId={grupoSeleccionado}
          onVolver={() => setGrupoSeleccionado(null)}
        />
      </div>
    );
  }

  // ── Error / aviso ─────────────────────────────────────────────────────────
  if (aviso) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <PageHeader title="Mis grupos" />
        <ContentCard className="p-12">
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="rounded-full bg-muted p-5">
              <AlertCircle className="h-10 w-10 text-muted-foreground" />
            </div>
            <p className="font-heading font-semibold">No disponible</p>
            <p className="text-sm text-muted-foreground max-w-sm">{aviso}</p>
          </div>
        </ContentCard>
      </div>
    );
  }

  // ── Lista de grupos ───────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-6 p-6">
      <PageHeader
        title="Mis grupos"
        description={`Grupos asignados en la gestión ${gestion?.codigo ?? "—"}`}
      />

      {/* Banner del docente */}
      {docente && (
        <div className="flex items-center gap-3 rounded-xl border bg-card px-5 py-4 shadow-sm">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary font-heading text-sm font-bold text-primary-foreground">
            {docente.nombres.charAt(0)}
          </div>
          <div>
            <p className="font-semibold text-sm">{docente.nombres} {docente.apellidos}</p>
            {docente.titulo && (
              <p className="text-xs text-muted-foreground">{docente.titulo}</p>
            )}
          </div>
          <div className="ml-auto text-xs text-muted-foreground">
            {grupos.length} grupo{grupos.length === 1 ? "" : "s"} asignado{grupos.length === 1 ? "" : "s"}
          </div>
        </div>
      )}

      {/* Sin grupos */}
      {grupos.length === 0 ? (
        <ContentCard className="p-12">
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="rounded-full bg-muted p-5">
              <UserCircle className="h-10 w-10 text-muted-foreground" />
            </div>
            <p className="font-heading font-semibold">Sin grupos asignados</p>
            <p className="text-sm text-muted-foreground max-w-sm">
              No tiene grupos asignados en la gestión activa ({gestion?.codigo}).
              Contacte al coordinador académico.
            </p>
          </div>
        </ContentCard>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {grupos.map((grupo) => (
            <GrupoCard
              key={grupo.id}
              grupo={grupo}
              onVerDetalle={(g) => setGrupoSeleccionado(g.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
