// Página de reportes dinámicos (UC-18 PDF, UC-19 Excel).
// 3 tipos: postulantes, resultados (ranking), notas.
// Vista previa en pantalla antes de descargar.

import { useState } from "react";
import {
  FileBarChart, Download, FileSpreadsheet, Eye,
  Loader2, Filter, RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import {
  reportesService,
  type TipoReporte,
  type FiltrosReporte,
  type PreviewReporte,
} from "@/services/reportesService";
import { PageHeader, ContentCard } from "@/components/ui-shared";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

// ── Configuración de tipos de reporte ────────────────────────────────────────
const TIPOS_REPORTE: { value: TipoReporte; label: string; descripcion: string }[] = [
  {
    value: "postulantes",
    label: "Postulantes",
    descripcion: "Lista de postulantes con estado, carrera de opción y datos personales.",
  },
  {
    value: "resultados",
    label: "Resultados y Admisión",
    descripcion: "Ranking de admitidos y no admitidos por promedio general y carrera asignada.",
  },
  {
    value: "notas",
    label: "Notas y Promedios",
    descripcion: "Calificaciones por materia y examen con promedios ponderados (30/30/40).",
  },
];

const ESTADOS = [
  { value: "confirmado",  label: "Confirmado" },
  { value: "aprobado",    label: "Aprobado" },
  { value: "reprobado",   label: "Reprobado" },
  { value: "admitido",    label: "Admitido" },
  { value: "no_admitido", label: "No admitido" },
];

const CARRERAS = [
  { value: "1", label: "Ingeniería en Sistemas" },
  { value: "2", label: "Ingeniería en Telecomunicaciones" },
  { value: "3", label: "Ingeniería Informática" },
  { value: "4", label: "Licenciatura en Informática" },
];

const MATERIAS = [
  { value: "1", label: "Computación" },
  { value: "2", label: "Matemáticas" },
  { value: "3", label: "Inglés" },
  { value: "4", label: "Física" },
];

const OPCIONES = [
  { value: "primera",     label: "1ra opción" },
  { value: "segunda",     label: "2da opción" },
  { value: "no_admitido", label: "No admitidos" },
];

// ── Columnas visibles en la vista previa por tipo ────────────────────────────
const COLUMNAS_PREVIEW: Record<TipoReporte, { key: string; label: string }[]> = {
  postulantes: [
    { key: "ci",          label: "CI" },
    { key: "apellidos",   label: "Apellidos" },
    { key: "nombres",     label: "Nombres" },
    { key: "estado",      label: "Estado" },
    { key: "carrera_1ra", label: "1ra Opción" },
    { key: "ciudad",      label: "Ciudad" },
  ],
  resultados: [
    { key: "posicion",         label: "#" },
    { key: "ci",               label: "CI" },
    { key: "apellidos",        label: "Apellidos" },
    { key: "nombres",          label: "Nombres" },
    { key: "promedio_general", label: "Promedio" },
    { key: "carrera",          label: "Carrera" },
    { key: "opcion_asignada",  label: "Opción" },
  ],
  notas: [
    { key: "ci",              label: "CI" },
    { key: "apellidos",       label: "Apellidos" },
    { key: "COMP_prom",       label: "COMP" },
    { key: "MAT_prom",        label: "MAT" },
    { key: "ING_prom",        label: "ING" },
    { key: "FIS_prom",        label: "FIS" },
    { key: "promedio_general", label: "Promedio" },
    { key: "estado",          label: "Estado" },
  ],
};

// ── Página principal ──────────────────────────────────────────────────────────
export function ReportesPage() {
  const [tipo, setTipo] = useState<TipoReporte>("postulantes");
  const [estado, setEstado] = useState("todos");
  const [carreraId, setCarreraId] = useState("todos");
  const [materiaId, setMateriaId] = useState("todos");
  const [opcion, setOpcion] = useState("todos");

  const [preview, setPreview] = useState<PreviewReporte | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [descargandoPdf, setDescargandoPdf] = useState(false);
  const [descargandoExcel, setDescargandoExcel] = useState(false);

  function buildFiltros(): FiltrosReporte {
    return {
      tipo,
      estado:     estado     !== "todos" ? estado     : undefined,
      carrera_id: carreraId  !== "todos" ? parseInt(carreraId) : undefined,
      materia_id: materiaId  !== "todos" ? parseInt(materiaId) : undefined,
      opcion:     opcion     !== "todos" ? opcion     : undefined,
    };
  }

  async function handlePreview() {
    setLoadingPreview(true);
    try {
      const res = await reportesService.preview(buildFiltros());
      setPreview(res);
    } catch (err: unknown) {
      toast.error((err as Error).message ?? "No se pudo cargar la vista previa.");
    } finally { setLoadingPreview(false); }
  }

  async function handlePdf() {
    setDescargandoPdf(true);
    try {
      await reportesService.descargarPdf(buildFiltros());
      toast.success("PDF descargado correctamente.");
    } catch (err: unknown) {
      toast.error((err as Error).message ?? "No se pudo generar el PDF.");
    } finally { setDescargandoPdf(false); }
  }

  async function handleExcel() {
    setDescargandoExcel(true);
    try {
      await reportesService.descargarExcel(buildFiltros());
      toast.success("Excel descargado correctamente.");
    } catch (err: unknown) {
      toast.error((err as Error).message ?? "No se pudo generar el Excel.");
    } finally { setDescargandoExcel(false); }
  }

  const tipoActual = TIPOS_REPORTE.find((t) => t.value === tipo);
  const columnas   = COLUMNAS_PREVIEW[tipo];

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Reportes"
        description="UC-18: exportar PDF · UC-19: exportar Excel · Filtros dinámicos por tipo, estado y carrera"
      />

      {/* Panel de configuración */}
      <ContentCard className="p-5">
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Filter className="h-4 w-4 text-primary" />
            Configurar reporte
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {/* Tipo de reporte */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Tipo de reporte</label>
              <Select value={tipo} onValueChange={(v) => { setTipo(v as TipoReporte); setPreview(null); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TIPOS_REPORTE.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Filtro estado — solo postulantes y notas */}
            {(tipo === "postulantes" || tipo === "notas") && (
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Estado</label>
                <Select value={estado} onValueChange={setEstado}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos los estados</SelectItem>
                    {ESTADOS.map((e) => (
                      <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Filtro carrera — postulantes y resultados */}
            {(tipo === "postulantes" || tipo === "resultados") && (
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Carrera</label>
                <Select value={carreraId} onValueChange={setCarreraId}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todas las carreras</SelectItem>
                    {CARRERAS.map((c) => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Filtro materia — solo notas */}
            {tipo === "notas" && (
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Materia</label>
                <Select value={materiaId} onValueChange={setMateriaId}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todas las materias</SelectItem>
                    {MATERIAS.map((m) => (
                      <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Filtro opción — solo resultados */}
            {tipo === "resultados" && (
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Opción asignada</label>
                <Select value={opcion} onValueChange={setOpcion}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todas las opciones</SelectItem>
                    {OPCIONES.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Descripción del tipo seleccionado */}
          {tipoActual && (
            <p className="text-xs text-muted-foreground">{tipoActual.descripcion}</p>
          )}

          {/* Acciones */}
          <div className="flex flex-wrap gap-2 pt-2 border-t border-border/50">
            <Button variant="outline" onClick={handlePreview} disabled={loadingPreview} className="gap-1.5">
              {loadingPreview ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Eye className="h-3.5 w-3.5" />}
              {loadingPreview ? "Cargando..." : "Vista previa"}
            </Button>

            <Button onClick={handlePdf} disabled={descargandoPdf} className="gap-1.5">
              {descargandoPdf ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
              {descargandoPdf ? "Generando PDF..." : "Descargar PDF"}
            </Button>

            <Button variant="outline" onClick={handleExcel} disabled={descargandoExcel} className="gap-1.5">
              {descargandoExcel
                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                : <FileSpreadsheet className="h-3.5 w-3.5" />}
              {descargandoExcel ? "Generando Excel..." : "Descargar Excel"}
            </Button>

            {preview && (
              <Button variant="ghost" size="sm" onClick={() => setPreview(null)} className="gap-1.5 ml-auto">
                <RefreshCw className="h-3.5 w-3.5" /> Limpiar
              </Button>
            )}
          </div>
        </div>
      </ContentCard>

      {/* Vista previa */}
      {preview && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileBarChart className="h-4 w-4 text-primary" />
              <span className="font-semibold text-sm">
                Vista previa — {tipoActual?.label}
              </span>
              <span className="text-xs text-muted-foreground">
                ({preview.total} registros · Gestión {preview.gestion.codigo})
              </span>
            </div>
          </div>

          <ContentCard>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    {columnas.map((col) => (
                      <TableHead key={col.key} className="font-semibold text-xs">
                        {col.label}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {preview.data.slice(0, 20).map((fila, i) => (
                    <TableRow key={i} className="hover:bg-muted/30">
                      {columnas.map((col) => (
                        <TableCell key={col.key} className="text-xs">
                          {col.key === "estado" ? (
                            <span className={cn(
                              "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium",
                              fila[col.key] === "admitido"    ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                            : fila[col.key] === "aprobado"    ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                            : fila[col.key] === "reprobado"   ? "bg-destructive/10 text-destructive border-destructive/20"
                            : fila[col.key] === "no_admitido" ? "bg-destructive/10 text-destructive border-destructive/20"
                            : "bg-primary/10 text-primary border-primary/20"
                            )}>
                              {String(fila[col.key] ?? "—").replace("_", " ")}
                            </span>
                          ) : (
                            String(fila[col.key] ?? "—")
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {preview.total > 20 && (
              <p className="px-4 py-3 text-xs text-muted-foreground border-t border-border/50">
                Mostrando los primeros 20 de {preview.total} registros. Descargue el reporte para ver todos.
              </p>
            )}
          </ContentCard>
        </div>
      )}
    </div>
  );
}
