// Portal del postulante — Mis Notas (UC-23).
// Muestra las 3 calificaciones por materia y el promedio ponderado.
// Si la gestión no está en fase en_curso o finalizada, muestra mensaje.

import { useEffect, useState } from "react";
import { AlertCircle, Loader2, TrendingUp, CheckCircle2, XCircle } from "lucide-react";
import { PageHeader, ContentCard, EstadoBadge } from "@/components/ui-shared";
import { cn } from "@/lib/utils";
import { portalService, type NotaMateria, type InfoPostulante, type InfoGestion } from "@/services/portalService";

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Nota aprobada si promedio >= 60 (nota_minima_aprobacion). */
function estaAprobada(promedio: number | null): boolean | null {
  if (promedio === null) return null;
  return promedio >= 60;
}

/** Formatea calificación con 2 decimales o muestra guión si es nula. */
function formatNota(valor: number | null): string {
  if (valor === null) return "—";
  return valor.toFixed(2);
}

// ── Tarjeta de notas por materia ─────────────────────────────────────────────

function NotaMateriaCard({ item }: { item: NotaMateria }) {
  const aprobada = estaAprobada(item.promedio);

  return (
    <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
      {/* Franja de color según estado */}
      <div
        className={cn(
          "h-1.5 w-full",
          aprobada === true
            ? "bg-emerald-500"
            : aprobada === false
            ? "bg-destructive"
            : "bg-border"
        )}
      />

      <div className="p-5">
        {/* Encabezado: materia + badge aprobada/reprobada */}
        <div className="mb-4 flex items-start justify-between gap-2">
          <div>
            <span className="inline-block rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-bold text-primary mb-1">
              {item.materia.codigo}
            </span>
            <h3 className="font-heading text-base font-semibold">{item.materia.nombre}</h3>
          </div>
          {aprobada !== null && (
            <div className="flex items-center gap-1 shrink-0">
              {aprobada ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              ) : (
                <XCircle className="h-4 w-4 text-destructive" />
              )}
              <span
                className={cn(
                  "text-xs font-semibold",
                  aprobada ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"
                )}
              >
                {aprobada ? "Aprobada" : "Reprobada"}
              </span>
            </div>
          )}
        </div>

        {/* Tabla de notas */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          {([1, 2, 3] as const).map((n) => {
            const key = `examen_${n}` as "examen_1" | "examen_2" | "examen_3";
            const val = item.notas[key];
            const pesos = { 1: "30%", 2: "30%", 3: "40%" };

            return (
              <div
                key={n}
                className="flex flex-col items-center rounded-lg bg-muted/50 px-2 py-3 text-center"
              >
                <span className="text-[10px] text-muted-foreground mb-0.5">
                  Examen {n} · {pesos[n]}
                </span>
                <span
                  className={cn(
                    "font-heading text-xl font-bold",
                    val === null
                      ? "text-muted-foreground/40"
                      : val >= 60
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-destructive"
                  )}
                >
                  {formatNota(val)}
                </span>
              </div>
            );
          })}
        </div>

        {/* Promedio */}
        <div className="flex items-center justify-between border-t border-border/50 pt-3">
          <span className="text-sm text-muted-foreground">Promedio ponderado</span>
          <span
            className={cn(
              "font-heading text-lg font-bold",
              aprobada === true
                ? "text-emerald-600 dark:text-emerald-400"
                : aprobada === false
                ? "text-destructive"
                : "text-muted-foreground"
            )}
          >
            {item.promedio !== null ? item.promedio.toFixed(2) : "—"}
          </span>
        </div>

        {/* Aviso si faltan notas */}
        {!item.notas_completas && (
          <p className="mt-2 text-[11px] text-muted-foreground/70 italic text-center">
            {item.total_notas === 0
              ? "Notas pendientes de registro"
              : `${item.total_notas} de 3 notas registradas`}
          </p>
        )}
      </div>
    </div>
  );
}

// ── Tarjeta de resumen general ────────────────────────────────────────────────

function ResumenGeneral({
  promedioGeneral,
  estadoPostulante,
  materiasCompletas,
  totalMaterias,
  postulante,
  gestion,
}: {
  promedioGeneral: number | null;
  estadoPostulante: string;
  materiasCompletas: number;
  totalMaterias: number;
  postulante: InfoPostulante;
  gestion: InfoGestion;
}) {
  const aprobado = estaAprobada(promedioGeneral);

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border bg-card px-5 py-4 shadow-sm">
      {/* Info postulante */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary font-heading text-sm font-bold text-primary-foreground">
          {postulante.nombres.charAt(0)}
        </div>
        <div>
          <p className="font-semibold text-sm">{postulante.nombres} {postulante.apellidos}</p>
          <p className="text-xs text-muted-foreground">CI: {postulante.ci} · Gestión {gestion.codigo}</p>
        </div>
      </div>

      {/* Resumen de notas */}
      <div className="flex items-center gap-6">
        {/* Materias completas */}
        <div className="text-center">
          <p className="font-heading text-xl font-bold">{materiasCompletas}/{totalMaterias}</p>
          <p className="text-[11px] text-muted-foreground">Materias con notas</p>
        </div>

        {/* Promedio general */}
        <div className="text-center">
          <p
            className={cn(
              "font-heading text-2xl font-bold",
              aprobado === true
                ? "text-emerald-600 dark:text-emerald-400"
                : aprobado === false
                ? "text-destructive"
                : "text-muted-foreground"
            )}
          >
            {promedioGeneral !== null ? promedioGeneral.toFixed(2) : "—"}
          </p>
          <p className="text-[11px] text-muted-foreground">Promedio general</p>
        </div>

        {/* Estado del postulante */}
        <div className="text-center">
          <EstadoBadge estado={estadoPostulante} />
          <p className="text-[11px] text-muted-foreground mt-1">Estado</p>
        </div>
      </div>
    </div>
  );
}

// ── Aviso de fase insuficiente ────────────────────────────────────────────────

function AvisoFase({ mensaje }: { mensaje: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
      <div className="rounded-full bg-muted p-5">
        <AlertCircle className="h-10 w-10 text-muted-foreground" />
      </div>
      <div>
        <p className="font-heading font-semibold text-foreground">No disponible aún</p>
        <p className="mt-1 text-sm text-muted-foreground max-w-sm">{mensaje}</p>
      </div>
    </div>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────

export function MisNotasPage() {
  const [notas, setNotas] = useState<NotaMateria[]>([]);
  const [resumen, setResumen] = useState<{
    promedio_general: number | null;
    materias_completas: number;
    total_materias: number;
    estado_postulante: string;
  } | null>(null);
  const [postulante, setPostulante] = useState<InfoPostulante | null>(null);
  const [gestion, setGestion] = useState<InfoGestion | null>(null);
  const [loading, setLoading] = useState(true);
  const [aviso, setAviso] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);

    portalService
      .misNotas()
      .then((res) => {
        setNotas(res.data);
        setResumen(res.resumen);
        setPostulante(res.postulante);
        setGestion(res.gestion);
        setAviso(null);
      })
      .catch(async (err) => {
        try {
          const body = await err.response?.json();
          setAviso(body?.message ?? "No se pudieron cargar las notas.");
        } catch {
          setAviso("No se pudieron cargar las notas.");
        }
      })
      .finally(() => setLoading(false));
  }, []);

  // ── Estado de carga ─────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <PageHeader
          title="Mis notas"
          description="Tus calificaciones y promedios por materia."
        />
        <div className="flex items-center justify-center py-24 gap-3 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm">Cargando notas...</span>
        </div>
      </div>
    );
  }

  // ── Sin inscripción o fase insuficiente ─────────────────────────────────────
  if (aviso) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <PageHeader
          title="Mis notas"
          description="Tus calificaciones y promedios por materia."
        />
        <ContentCard>
          <AvisoFase mensaje={aviso} />
        </ContentCard>
      </div>
    );
  }

  // ── Vista principal ─────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-6 p-6">
      <PageHeader
        title="Mis notas"
        description="Calificaciones y promedios ponderados por materia."
      />

      {/* Banner de resumen */}
      {postulante && gestion && resumen && (
        <ResumenGeneral
          promedioGeneral={resumen.promedio_general}
          estadoPostulante={resumen.estado_postulante}
          materiasCompletas={resumen.materias_completas}
          totalMaterias={resumen.total_materias}
          postulante={postulante}
          gestion={gestion}
        />
      )}

      {/* Grilla de materias */}
      {notas.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {notas.map((item) => (
            <NotaMateriaCard key={item.materia.id} item={item} />
          ))}
        </div>
      ) : (
        <ContentCard>
          <AvisoFase mensaje="No hay notas registradas para tu inscripción en esta gestión." />
        </ContentCard>
      )}

      {/* Fórmula de ponderación */}
      <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
        <TrendingUp className="h-3.5 w-3.5" />
        <span>Promedio ponderado: Examen 1 (30%) + Examen 2 (30%) + Examen 3 (40%) · Mínimo aprobatorio: 60 puntos</span>
      </div>
    </div>
  );
}
