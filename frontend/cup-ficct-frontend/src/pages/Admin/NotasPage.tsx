// Registro de notas y cálculo de promedios (UC-12 y UC-13).
// Vista A: tabla por materia (registro masivo por examen).
// Vista B: búsqueda por postulante (ver/editar notas de un alumno específico).

import { useEffect, useState} from "react";
import {
  BookOpen, Search, Calculator, CheckCircle2, XCircle,
  Loader2, AlertCircle, Save, RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { useConfirm } from "@/context/useConfirm";
import {
  notasService,
  type FilaPostulanteNotas,
  type NotasPorMateriaResponse,
  type NotasPorPostulanteResponse,
} from "@/services/notasService";
import { PageHeader, ContentCard, EstadoBadge } from "@/components/ui-shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

// ── Materias disponibles (catálogo fijo) ──────────────────────────────────────
const MATERIAS = [
  { id: 1, nombre: "Computación", codigo: "COMP" },
  { id: 2, nombre: "Matemáticas", codigo: "MAT" },
  { id: 3, nombre: "Inglés",      codigo: "ING" },
  { id: 4, nombre: "Física",      codigo: "FIS" },
];

const materiaColors: Record<string, string> = {
  COMP: "bg-primary/10 text-primary border-primary/20",
  MAT:  "bg-amber-500/10 text-amber-600 border-amber-500/20 dark:text-amber-400",
  ING:  "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-400",
  FIS:  "bg-purple-500/10 text-purple-600 border-purple-500/20 dark:text-purple-400",
};

// ── Helper: formatear calificación ────────────────────────────────────────────
function fmtNota(v: number | string | null): string {
  if (v === null || v === undefined) return "—";
  return Number(v).toFixed(2);
}

// ── Vista A: tabla por materia ────────────────────────────────────────────────
function VistaPorMateria() {
  const confirm = useConfirm();
  const [materiaId, setMateriaId] = useState<number>(1);
  const [examenNum, setExamenNum] = useState<number>(1);
  const [datos, setDatos] = useState<NotasPorMateriaResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [guardando, setGuardando] = useState(false);
  // Notas editadas en la UI — clave: postulante_id, valor: calificación string
  const [notasEditadas, setNotasEditadas] = useState<Record<number, string>>({});

  async function cargar() {
    setLoading(true);
    setNotasEditadas({});
    try {
      const res = await notasService.porMateria(materiaId);
      setDatos(res);
    } catch (err: unknown) {
      const e = err as { message?: string };
      toast.error(e?.message ?? "No se pudieron cargar las notas.");
      setDatos(null);
    } finally { setLoading(false); }
  }

  useEffect(() => { cargar(); }, [materiaId]);

  // Obtener el examen_id correspondiente al número de examen seleccionado.
  function getExamenId(): number | null {
    return datos?.examenes.find((e) => e.numero === examenNum)?.id ?? null;
  }

  function setNota(postId: number, valor: string) {
    setNotasEditadas((prev) => ({ ...prev, [postId]: valor }));
  }

  // Obtener el valor actual de la nota para mostrar en el input.
  function getNotaActual(fila: FilaPostulanteNotas): string {
    if (notasEditadas[fila.postulante_id] !== undefined) {
      return notasEditadas[fila.postulante_id];
    }
    const nota = fila.notas.find((n) => n.numero === examenNum);
    return nota?.calificacion !== null && nota?.calificacion !== undefined
      ? String(Number(nota.calificacion).toFixed(2))
      : "";
  }

  async function guardarLote() {
    const examenId = getExamenId();
    if (!examenId) { toast.error("Seleccione un examen válido."); return; }

    const notas = Object.entries(notasEditadas)
      .filter(([, v]) => v !== "" && !isNaN(Number(v)))
      .map(([postId, cal]) => ({
        postulante_id: parseInt(postId),
        calificacion: Math.min(100, Math.max(0, Number(cal))),
      }));

    if (notas.length === 0) { toast.error("No hay notas modificadas para guardar."); return; }

    setGuardando(true);
    try {
      const res = await notasService.registrarLote({ examen_id: examenId, notas });
      toast.success(res.message);
      cargar();
    } catch (err: unknown) {
      toast.error((err as { message?: string })?.message ?? "No se pudieron guardar las notas.");
    } finally { setGuardando(false); }
  }

  async function calcularTodos() {
    const ok = await confirm({
      title: "Calcular promedios",
      description: "Se calculará el promedio ponderado (30/30/40) y se actualizará el estado de todos los postulantes con notas completas. ¿Confirmar?",
      confirmText: "Calcular todos",
    });
    if (!ok) return;

    try {
      const res = await notasService.calcularTodos();
      toast.success(`${res.message} — Aprobados: ${res.data.aprobados} | Reprobados: ${res.data.reprobados} | Pendientes: ${res.data.pendientes}`);
      cargar();
    } catch (err: unknown) {
      toast.error((err as { message?: string })?.message ?? "No se pudo calcular.");
    }
  }

  const materia = MATERIAS.find((m) => m.id === materiaId);
  const hayModificaciones = Object.keys(notasEditadas).length > 0;

  return (
    <div className="space-y-4">
      {/* Controles */}
      <ContentCard className="p-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Selector de materia */}
          <Select value={String(materiaId)} onValueChange={(v) => setMateriaId(Number(v))}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Seleccionar materia" />
            </SelectTrigger>
            <SelectContent>
              {MATERIAS.map((m) => (
                <SelectItem key={m.id} value={String(m.id)}>
                  <span className="font-mono text-xs mr-2 text-muted-foreground">{m.codigo}</span>
                  {m.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Selector de examen */}
          <Select value={String(examenNum)} onValueChange={(v) => setExamenNum(Number(v))}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Examen" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">Examen 1 (30%)</SelectItem>
              <SelectItem value="2">Examen 2 (30%)</SelectItem>
              <SelectItem value="3">Examen 3 (40%)</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" onClick={cargar} className="gap-1.5">
            <RefreshCw className="h-3.5 w-3.5" /> Recargar
          </Button>

          <div className="flex-1" />

          {/* Guardar lote */}
          {hayModificaciones && (
            <Button onClick={guardarLote} disabled={guardando} className="gap-1.5">
              {guardando ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              {guardando ? "Guardando..." : `Guardar ${Object.keys(notasEditadas).length} notas`}
            </Button>
          )}

          {/* Calcular promedios */}
          <Button variant="outline" onClick={calcularTodos} className="gap-1.5">
            <Calculator className="h-3.5 w-3.5" /> Calcular promedios
          </Button>
        </div>
      </ContentCard>

      {/* Badge de materia seleccionada */}
      {materia && (
        <div className="flex items-center gap-2">
          <span className={cn(
            "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-bold",
            materiaColors[materia.codigo] ?? "bg-muted border-border"
          )}>
            <BookOpen className="h-3.5 w-3.5" />{materia.codigo}
          </span>
          <span className="font-heading font-semibold">{materia.nombre}</span>
          {datos && <span className="text-sm text-muted-foreground">— {datos.total} postulantes</span>}
        </div>
      )}

      {/* Tabla de notas */}
      <ContentCard>
        {loading ? (
          <div className="flex items-center justify-center py-16 gap-3 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-sm">Cargando notas...</span>
          </div>
        ) : !datos || datos.data.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center text-muted-foreground">
            <AlertCircle className="h-8 w-8" />
            <p className="text-sm font-medium">No hay datos disponibles</p>
            <p className="text-xs max-w-sm">
              Asegúrese de que los grupos hayan sido generados y existan postulantes confirmados.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="font-semibold">CI</TableHead>
                  <TableHead className="font-semibold">Apellidos</TableHead>
                  <TableHead className="font-semibold">Nombres</TableHead>
                  <TableHead className="font-semibold text-center w-36">
                    Examen {examenNum} ({datos.pesos[examenNum as 1|2|3]}%)
                  </TableHead>
                  <TableHead className="font-semibold text-center">Promedio</TableHead>
                  <TableHead className="font-semibold">Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {datos.data.map((fila) => {
                  const valorInput = getNotaActual(fila);
                  const modificado = notasEditadas[fila.postulante_id] !== undefined;

                  return (
                    <TableRow key={fila.postulante_id}
                      className={cn("transition-colors hover:bg-muted/30", modificado && "bg-primary/5")}>
                      <TableCell className="font-mono text-sm">{fila.ci}</TableCell>
                      <TableCell className="font-medium">{fila.apellidos}</TableCell>
                      <TableCell>{fila.nombres}</TableCell>
                      <TableCell className="text-center">
                        <Input
                          type="number" min={0} max={100} step={0.01}
                          value={valorInput}
                          onChange={(e) => setNota(fila.postulante_id, e.target.value)}
                          className={cn("h-8 w-28 text-center mx-auto",
                            modificado && "border-primary ring-1 ring-primary/20")}
                          placeholder="0-100"
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        {fila.promedio !== null ? (
                          <span className={cn("font-heading font-bold text-sm",
                            Number(fila.promedio) >= 60
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-destructive")}>
                            {fmtNota(fila.promedio)}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell><EstadoBadge estado={fila.estado} /></TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </ContentCard>
    </div>
  );
}

// ── Vista B: búsqueda por postulante ─────────────────────────────────────────
function VistaPorPostulante() {
  const [busqueda, setBusqueda] = useState("");
  const [datos, setDatos] = useState<NotasPorPostulanteResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [calculando, setCalculando] = useState(false);
  // Nota editada individualmente
  const [editando, setEditando] = useState<{
    examen_id: number; valor: string;
  } | null>(null);
  const [guardandoNota, setGuardandoNota] = useState(false);

  async function buscar() {
    if (!busqueda.trim()) { toast.error("Ingrese un CI o nombre para buscar."); return; }

    setLoading(true);
    try {
      // Buscar el postulante por CI via el servicio de postulantes.
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/postulantes?search=${encodeURIComponent(busqueda)}&per_page=5`,
        { headers: { Authorization: `Bearer ${localStorage.getItem("cup_token")}`, Accept: "application/json" } }
      );
      const json = await res.json();
      const postulantes = json.data ?? [];

      if (postulantes.length === 0) {
        toast.error("No se encontró ningún postulante con ese CI o nombre.");
        setDatos(null);
        return;
      }

      // Tomar el primero y cargar sus notas.
      const p = postulantes[0];
      const resNotas = await notasService.porPostulante(p.id);
      setDatos(resNotas);
    } catch {
      toast.error("No se pudo realizar la búsqueda.");
    } finally { setLoading(false); }
  }

  async function guardarNota() {
    if (!editando || !datos) return;
    const val = Number(editando.valor);
    if (isNaN(val) || val < 0 || val > 100) {
      toast.error("Ingrese una calificación válida entre 0 y 100.");
      return;
    }

    setGuardandoNota(true);
    try {
      await notasService.registrar({
        postulante_id: datos.postulante.id,
        examen_id: editando.examen_id,
        calificacion: val,
      });
      toast.success("Nota guardada correctamente.");
      setEditando(null);
      // Recargar notas del postulante.
      const resNotas = await notasService.porPostulante(datos.postulante.id);
      setDatos(resNotas);
    } catch (err: unknown) {
      toast.error((err as { message?: string })?.message ?? "No se pudo guardar la nota.");
    } finally { setGuardandoNota(false); }
  }

  async function calcularPostulante() {
    if (!datos) return;
    setCalculando(true);
    try {
      const res = await notasService.calcularPostulante(datos.postulante.id);
      toast.success(res.message as string);
      const resNotas = await notasService.porPostulante(datos.postulante.id);
      setDatos(resNotas);
    } catch {
      toast.error("No se pudo calcular el promedio.");
    } finally { setCalculando(false); }
  }

  return (
    <div className="space-y-4">
      {/* Buscador */}
      <ContentCard className="p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[250px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Buscar por CI, nombre o apellido..."
              value={busqueda} onChange={(e) => setBusqueda(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && buscar()}
              className="pl-9" />
          </div>
          <Button onClick={buscar} disabled={loading} className="gap-1.5">
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
            {loading ? "Buscando..." : "Buscar"}
          </Button>
        </div>
      </ContentCard>

      {/* Resultado */}
      {datos && (
        <>
          {/* Info del postulante */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card px-5 py-3 shadow-sm">
            <div>
              <p className="font-heading font-bold">{datos.postulante.nombres} {datos.postulante.apellidos}</p>
              <p className="text-xs text-muted-foreground">CI: {datos.postulante.ci} · Gestión {datos.gestion.codigo}</p>
            </div>
            <div className="flex items-center gap-3">
              <EstadoBadge estado={datos.postulante.estado} />
              <Button variant="outline" size="sm" onClick={calcularPostulante}
                disabled={calculando} className="gap-1.5">
                {calculando ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Calculator className="h-3.5 w-3.5" />}
                Calcular promedio
              </Button>
            </div>
          </div>

          {/* Tarjetas por materia */}
          <div className="grid gap-4 sm:grid-cols-2">
            {datos.data.map((materia) => (
              <ContentCard key={materia.materia.id} className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <span className={cn(
                    "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-bold",
                    materiaColors[materia.materia.codigo] ?? "bg-muted border-border"
                  )}>
                    <BookOpen className="h-3 w-3" />{materia.materia.codigo}
                  </span>
                  <span className="font-semibold text-sm">{materia.materia.nombre}</span>
                  {materia.aprobada !== null && (
                    materia.aprobada
                      ? <CheckCircle2 className="h-4 w-4 text-emerald-500 ml-auto" />
                      : <XCircle className="h-4 w-4 text-destructive ml-auto" />
                  )}
                </div>

                {/* Notas individuales */}
                <div className="grid grid-cols-3 gap-2 mb-3">
                  {materia.notas.map((nota) => {
                    const estaEditando = editando?.examen_id === nota.examen_id;
                    return (
                      <div key={nota.examen_id}
                        className="flex flex-col items-center rounded-lg bg-muted/50 px-2 py-2 text-center">
                        <span className="text-[10px] text-muted-foreground mb-1">
                          Ex. {nota.numero} · {nota.peso}%
                        </span>
                        {estaEditando ? (
                          <div className="flex flex-col gap-1 w-full">
                            <Input type="number" min={0} max={100} step={0.01}
                              value={editando.valor}
                              onChange={(e) => setEditando({ ...editando, valor: e.target.value })}
                              className="h-7 text-center text-xs px-1" autoFocus />
                            <div className="flex gap-1">
                              <Button size="sm" onClick={guardarNota} disabled={guardandoNota}
                                className="h-6 flex-1 text-[10px] px-1">
                                {guardandoNota ? "..." : "✓"}
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => setEditando(null)}
                                className="h-6 flex-1 text-[10px] px-1">✕</Button>
                            </div>
                          </div>
                        ) : (
                          <button onClick={() => setEditando({
                            examen_id: nota.examen_id,
                            valor: nota.calificacion !== null ? String(Number(nota.calificacion).toFixed(2)) : "",
                          })}
                            className="group w-full">
                            <span className={cn(
                              "font-heading text-lg font-bold block group-hover:opacity-70 transition-opacity",
                              nota.calificacion === null ? "text-muted-foreground/40"
                                : Number(nota.calificacion) >= 60 ? "text-emerald-600 dark:text-emerald-400"
                                : "text-destructive"
                            )}>
                              {fmtNota(nota.calificacion)}
                            </span>
                            <span className="text-[9px] text-muted-foreground/50 group-hover:text-primary transition-colors">
                              {nota.calificacion !== null ? "clic para editar" : "clic para ingresar"}
                            </span>
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Promedio de la materia */}
                <div className="flex items-center justify-between border-t border-border/50 pt-2">
                  <span className="text-xs text-muted-foreground">Promedio</span>
                  <span className={cn("font-heading text-base font-bold",
                    materia.promedio === null ? "text-muted-foreground"
                      : materia.promedio >= 60 ? "text-emerald-600 dark:text-emerald-400"
                      : "text-destructive")}>
                    {fmtNota(materia.promedio)}
                  </span>
                </div>
              </ContentCard>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ── Página principal con tabs ─────────────────────────────────────────────────
export function NotasPage() {
  const [tab, setTab] = useState<"materia" | "postulante">("materia");

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Registro de notas"
        description="UC-12: ingreso de calificaciones · UC-13: cálculo de promedios ponderados (30/30/40)"
      />

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg bg-muted p-1 w-fit">
        <button
          onClick={() => setTab("materia")}
          className={cn(
            "rounded-md px-4 py-2 text-sm font-medium transition-all",
            tab === "materia"
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Por materia
        </button>
        <button
          onClick={() => setTab("postulante")}
          className={cn(
            "rounded-md px-4 py-2 text-sm font-medium transition-all",
            tab === "postulante"
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Por postulante
        </button>
      </div>

      {/* Nota explicativa de la fórmula */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Calculator className="h-3.5 w-3.5" />
        Promedio ponderado: Examen 1 (30%) + Examen 2 (30%) + Examen 3 (40%) · Mínimo aprobatorio: 60 puntos
      </div>

      {/* Contenido del tab activo */}
      {tab === "materia" ? <VistaPorMateria /> : <VistaPorPostulante />}
    </div>
  );
}
