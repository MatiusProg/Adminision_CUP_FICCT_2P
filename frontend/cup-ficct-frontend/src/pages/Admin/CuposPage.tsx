// Asignación de cupos por carrera (UC-16).
// Algoritmo: ranking por promedio_general DESC → asignar a 1ra o 2da opción → no_admitido.
// Muestra resumen por carrera y tabla de ranking con filtros.

import { useEffect, useState } from "react";
import {
  Award, GraduationCap, Zap, Loader2,
  CheckCircle2, XCircle, ChevronLeft, ChevronRight, Trophy,
} from "lucide-react";
import { toast } from "sonner";
import { useConfirm } from "@/context/useConfirm";
import {
  cuposService,
  type CupoRanking,
  type ResumenCarrera,
  type ResultadoAsignacion,
  type OpcionAsignada,
} from "@/services/cuposService";
import { PageHeader, ContentCard } from "@/components/ui-shared";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

// ── Colores por opción asignada ───────────────────────────────────────────────
const opcionColors: Record<OpcionAsignada, string> = {
  primera:     "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-400",
  segunda:     "bg-amber-500/10 text-amber-600 border-amber-500/20 dark:text-amber-400",
  no_admitido: "bg-destructive/10 text-destructive border-destructive/20",
};

const opcionLabels: Record<OpcionAsignada, string> = {
  primera:     "1ra opción",
  segunda:     "2da opción",
  no_admitido: "No admitido",
};

// ── Tarjeta de resumen por carrera ────────────────────────────────────────────
function CarreraCard({ carrera }: { carrera: ResumenCarrera }) {
  const porcentaje = Math.min(carrera.porcentaje, 100);

  return (
    <div className="rounded-xl border bg-card p-5 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 border border-primary/20 px-2.5 py-0.5 text-xs font-bold text-primary">
            <GraduationCap className="h-3 w-3" />{carrera.codigo}
          </span>
        </div>
        <span className={cn(
          "text-xs font-medium",
          porcentaje >= 100 ? "text-destructive" : porcentaje >= 80 ? "text-amber-600" : "text-emerald-600"
        )}>
          {carrera.porcentaje}% ocupado
        </span>
      </div>

      <h3 className="font-heading font-semibold text-sm mb-3">{carrera.carrera}</h3>

      {/* Barra de ocupación */}
      <div className="h-2 w-full rounded-full bg-muted mb-3">
        <div className={cn("h-2 rounded-full transition-all",
          porcentaje >= 100 ? "bg-destructive" : porcentaje >= 80 ? "bg-amber-500" : "bg-emerald-500"
        )} style={{ width: `${porcentaje}%` }} />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-2 text-center">
        <div className="rounded-lg bg-muted/50 p-2">
          <p className="font-heading text-lg font-bold text-emerald-600 dark:text-emerald-400">
            {carrera.admitidos_total}
          </p>
          <p className="text-[10px] text-muted-foreground">Admitidos</p>
        </div>
        <div className="rounded-lg bg-muted/50 p-2">
          <p className="font-heading text-lg font-bold text-muted-foreground">
            {carrera.cupos_libres}
          </p>
          <p className="text-[10px] text-muted-foreground">Cupos libres</p>
        </div>
      </div>

      {/* Detalle 1ra y 2da opción */}
      <div className="mt-3 flex justify-between text-xs text-muted-foreground">
        <span className="text-emerald-600 dark:text-emerald-400">
          1ra opción: {carrera.primera_opcion}
        </span>
        <span className="text-amber-600 dark:text-amber-400">
          2da opción: {carrera.segunda_opcion}
        </span>
        <span>Máx: {carrera.cupo_maximo}</span>
      </div>
    </div>
  );
}

// ── Banner de resultado de asignación ────────────────────────────────────────
function ResultadoBanner({ resultado }: { resultado: ResultadoAsignacion }) {
  return (
    <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
      <div className="flex items-start gap-3">
        <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="font-semibold text-sm text-emerald-700 dark:text-emerald-400">
            Cupos asignados correctamente
          </p>
          <div className="flex flex-wrap gap-4 mt-2 text-xs text-muted-foreground">
            <span>Total aprobados: <strong>{resultado.total_aprobados}</strong></span>
            <span className="text-emerald-600">Admitidos: <strong>{resultado.admitidos}</strong></span>
            <span className="text-destructive">No admitidos: <strong>{resultado.no_admitidos}</strong></span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────
export function CuposPage() {
  const confirm = useConfirm();
  const [resumen, setResumen] = useState<ResumenCarrera[]>([]);
  const [noAdmitidos, setNoAdmitidos] = useState(0);
  const [ranking, setRanking] = useState<CupoRanking[]>([]);
  const [gestion, setGestion] = useState<{ codigo: string; estado: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [asignando, setAsignando] = useState(false);
  const [resultado, setResultado] = useState<ResultadoAsignacion | null>(null);
  const [filtroCarrera] = useState("todos");
  const [filtroOpcion, setFiltroOpcion] = useState("todos");
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [totalRanking, setTotalRanking] = useState(0);

  async function cargarResumen() {
    try {
      const res = await cuposService.resumen();
      setResumen(res.data);
      setNoAdmitidos(res.no_admitidos);
      setGestion(res.gestion);
    } catch {
      // Si no hay cupos aún, resumen vacío es normal.
    }
  }

  async function cargarRanking(p: number = 1) {
    try {
      const res = await cuposService.ranking({
        carrera_id: filtroCarrera !== "todos" ? parseInt(filtroCarrera) : undefined,
        opcion: filtroOpcion !== "todos" ? filtroOpcion : undefined,
        page: p,
      });
      setRanking(res.data);
      setLastPage(res.meta.last_page);
      setTotalRanking(res.meta.total);
      setPage(res.meta.current_page);
      if (res.gestion) setGestion(res.gestion);
    } catch {
      setRanking([]);
    }
  }

  async function cargar() {
    setLoading(true);
    await Promise.all([cargarResumen(), cargarRanking(1)]);
    setLoading(false);
  }

  useEffect(() => { cargar(); }, []);
  useEffect(() => { cargarRanking(1); }, [filtroCarrera, filtroOpcion]);

  async function handleAsignar() {
    const ok = await confirm({
      title: "Ejecutar asignación de cupos",
      description:
        "Se ejecutará el algoritmo de ranking: los postulantes aprobados se ordenarán " +
        "por promedio general (mayor a menor) y se asignarán a su 1ra o 2da opción de carrera " +
        "según disponibilidad de cupos. Si ya existe una asignación previa, se reemplazará. ¿Confirmar?",
      confirmText: "Asignar cupos",
    });
    if (!ok) return;

    setAsignando(true);
    try {
      const res = await cuposService.asignar();
      setResultado(res.data);
      toast.success(res.message);
      cargar();
    } catch (err: unknown) {
      toast.error((err as { message?: string })?.message ?? "No se pudieron asignar los cupos.");
    } finally { setAsignando(false); }
  }

  const hayRanking = ranking.length > 0 || totalRanking > 0;

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Asignación de cupos"
        description={`UC-16: ranking por promedio general · gestión ${gestion?.codigo ?? "—"}`}
      >
        <Button onClick={handleAsignar} disabled={asignando} className="gap-2">
          {asignando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
          {asignando ? "Asignando..." : "Ejecutar asignación de cupos"}
        </Button>
      </PageHeader>

      {/* Explicación del algoritmo — visible para la defensa */}
      <ContentCard className="p-4">
        <div className="flex items-start gap-3">
          <Trophy className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
          <div className="text-xs text-muted-foreground space-y-1">
            <p className="font-medium text-foreground">Algoritmo de ranking (UC-16)</p>
            <p>1. Tomar postulantes con estado <strong>aprobado</strong> de la gestión activa.</p>
            <p>2. Ordenar por <strong>promedio general descendente</strong> (mejor promedio → mayor prioridad).</p>
            <p>3. Para cada postulante: asignar a <strong>1ra opción</strong> si hay cupo, sino a <strong>2da opción</strong>, sino → <strong>no admitido</strong>.</p>
            <p>4. Actualizar estado del postulante a <strong>admitido</strong> o <strong>no_admitido</strong>.</p>
          </div>
        </div>
      </ContentCard>

      {/* Banner de resultado */}
      {resultado && <ResultadoBanner resultado={resultado} />}

      {/* Resumen por carrera */}
      {loading ? (
        <div className="flex items-center justify-center py-12 gap-3 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm">Cargando datos...</span>
        </div>
      ) : resumen.length > 0 ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {resumen.map((c) => <CarreraCard key={c.codigo} carrera={c} />)}
          </div>

          {/* No admitidos globales */}
          {noAdmitidos > 0 && (
            <div className="flex items-center gap-3 rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3">
              <XCircle className="h-5 w-5 text-destructive shrink-0" />
              <p className="text-sm">
                <strong>{noAdmitidos}</strong> postulante{noAdmitidos === 1 ? "" : "s"} aprobado{noAdmitidos === 1 ? "" : "s"}
                {noAdmitidos === 1 ? " no obtuvo" : " no obtuvieron"} cupo en ninguna de sus opciones de carrera.
              </p>
            </div>
          )}
        </>
      ) : (
        <ContentCard className="p-12">
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="rounded-full bg-muted p-5">
              <Award className="h-10 w-10 text-muted-foreground" />
            </div>
            <p className="font-heading font-semibold">No hay cupos asignados aún</p>
            <p className="text-sm text-muted-foreground max-w-sm">
              Presione "Ejecutar asignación de cupos" para correr el algoritmo de ranking.
              Asegúrese de que los promedios estén calculados (UC-13).
            </p>
          </div>
        </ContentCard>
      )}

      {/* Tabla de ranking */}
      {hayRanking && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-heading font-semibold">Ranking de asignación</h2>
            <div className="flex flex-wrap gap-2">
              <Select value={filtroOpcion} onValueChange={setFiltroOpcion}>
                <SelectTrigger className="w-[160px] h-9">
                  <SelectValue placeholder="Todas las opciones" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todas las opciones</SelectItem>
                  <SelectItem value="primera">1ra opción</SelectItem>
                  <SelectItem value="segunda">2da opción</SelectItem>
                  <SelectItem value="no_admitido">No admitidos</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <ContentCard>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead className="font-semibold w-16 text-center">#</TableHead>
                    <TableHead className="font-semibold">Postulante</TableHead>
                    <TableHead className="font-semibold text-center">Promedio</TableHead>
                    <TableHead className="font-semibold">Carrera asignada</TableHead>
                    <TableHead className="font-semibold">Opción</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ranking.map((r) => (
                    <TableRow key={r.posicion_ranking} className="hover:bg-muted/30">
                      <TableCell className="text-center">
                        <span className={cn(
                          "font-heading font-bold text-sm",
                          r.posicion_ranking <= 3 ? "text-amber-500" : "text-muted-foreground"
                        )}>
                          {r.posicion_ranking <= 3 && "🏅 "}{r.posicion_ranking}
                        </span>
                      </TableCell>
                      <TableCell>
                        <p className="font-medium text-sm">{r.postulante.apellidos}, {r.postulante.nombres}</p>
                        <p className="text-xs text-muted-foreground font-mono">{r.postulante.ci}</p>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="font-heading font-bold text-sm">
                          {r.promedio_general.toFixed(2)}
                        </span>
                      </TableCell>
                      <TableCell>
                        {r.carrera ? (
                          <span className="text-sm">{r.carrera.nombre}</span>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">Sin cupo disponible</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className={cn(
                          "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
                          opcionColors[r.opcion_asignada]
                        )}>
                          {opcionLabels[r.opcion_asignada]}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </ContentCard>

          {/* Paginación */}
          {totalRanking > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">
                Página <span className="font-medium text-foreground">{page}</span> de{" "}
                <span className="font-medium text-foreground">{lastPage}</span> · {totalRanking} postulantes
              </p>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="icon" className="h-8 w-8"
                  disabled={page <= 1} onClick={() => cargarRanking(page - 1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="min-w-[2.5rem] text-center text-sm font-medium">{page}</span>
                <Button variant="outline" size="icon" className="h-8 w-8"
                  disabled={page >= lastPage} onClick={() => cargarRanking(page + 1)}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
