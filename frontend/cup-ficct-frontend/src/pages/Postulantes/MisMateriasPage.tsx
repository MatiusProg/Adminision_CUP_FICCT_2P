// Portal del postulante — Mis Materias (UC-23).
// Muestra los 4 grupos asignados al postulante: materia, grupo, aula, horario y docente.
// Si la gestión no está en fase suficiente, muestra un mensaje de estado.

import { useEffect, useState } from "react";
import { BookOpen, MapPin, Clock, UserCircle, AlertCircle, Loader2 } from "lucide-react";
import { PageHeader, ContentCard } from "@/components/ui-shared";
import { EstadoBadge } from "@/components/ui-shared";
import { portalService, type MateriaPortal, type InfoPostulante, type InfoGestion } from "@/services/portalService";

// ── Tarjeta de materia individual ─────────────────────────────────────────────

function MateriaCard({ item }: { item: MateriaPortal }) {
  return (
    <div className="rounded-xl border bg-card p-5 shadow-sm transition-shadow hover:shadow-md">
      {/* Encabezado: código de materia */}
      <div className="mb-4 flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
          <BookOpen className="h-3.5 w-3.5" />
          {item.materia.codigo}
        </span>
        <span className="text-xs text-muted-foreground font-medium">{item.grupo.nombre}</span>
      </div>

      {/* Nombre de la materia */}
      <h3 className="font-heading text-base font-semibold mb-3">{item.materia.nombre}</h3>

      {/* Detalles del grupo */}
      <div className="flex flex-col gap-2 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 shrink-0 text-primary/60" />
          <span>{item.grupo.aula}</span>
        </div>
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 shrink-0 text-primary/60" />
          <span>{item.grupo.horario}</span>
        </div>
      </div>

      {/* Docente */}
      <div className="mt-4 border-t border-border/50 pt-4">
        {item.docente ? (
          <div className="flex items-start gap-2">
            <UserCircle className="h-4 w-4 shrink-0 mt-0.5 text-muted-foreground" />
            <div className="text-sm">
              <p className="font-medium text-foreground">
                {item.docente.nombres} {item.docente.apellidos}
              </p>
              {item.docente.titulo && (
                <p className="text-xs text-muted-foreground">{item.docente.titulo}</p>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-sm text-muted-foreground/60 italic">
            <UserCircle className="h-4 w-4 shrink-0" />
            <span>Docente por asignar</span>
          </div>
        )}
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

// ── Banner del postulante ─────────────────────────────────────────────────────

function PostulanteBanner({
  postulante,
  gestion,
}: {
  postulante: InfoPostulante;
  gestion: InfoGestion;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card px-5 py-4 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary font-heading text-sm font-bold text-primary-foreground">
          {postulante.nombres.charAt(0)}
        </div>
        <div>
          <p className="font-semibold text-sm">{postulante.nombres} {postulante.apellidos}</p>
          <p className="text-xs text-muted-foreground">CI: {postulante.ci}</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-xs text-muted-foreground">Gestión {gestion.codigo}</span>
        <EstadoBadge estado={postulante.estado} />
      </div>
    </div>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────

export function MisMateriasPage() {
  const [materias, setMaterias] = useState<MateriaPortal[]>([]);
  const [postulante, setPostulante] = useState<InfoPostulante | null>(null);
  const [gestion, setGestion] = useState<InfoGestion | null>(null);
  const [loading, setLoading] = useState(true);
  // Mensaje de error/fase: puede ser 403 (fase) o 404 (sin inscripción)
  const [aviso, setAviso] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);

    portalService
      .misMaterias()
      .then((res) => {
        setMaterias(res.data);
        setPostulante(res.postulante);
        setGestion(res.gestion);
        setAviso(null);
      })
      .catch(async (err) => {
        // Leer el mensaje del backend (403 fase o 404 sin inscripción).
        try {
          const body = await err.response?.json();
          setAviso(body?.message ?? "No se pudieron cargar las materias.");
        } catch {
          setAviso("No se pudieron cargar las materias.");
        }
      })
      .finally(() => setLoading(false));
  }, []);

  // ── Estado de carga ─────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <PageHeader
          title="Mis materias"
          description="Tus grupos, aulas, horarios y docentes para esta gestión."
        />
        <div className="flex items-center justify-center py-24 gap-3 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm">Cargando materias...</span>
        </div>
      </div>
    );
  }

  // ── Sin inscripción o fase insuficiente ─────────────────────────────────────
  if (aviso) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <PageHeader
          title="Mis materias"
          description="Tus grupos, aulas, horarios y docentes para esta gestión."
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
        title="Mis materias"
        description="Tus grupos asignados para la gestión activa."
      />

      {/* Banner del postulante */}
      {postulante && gestion && (
        <PostulanteBanner postulante={postulante} gestion={gestion} />
      )}

      {/* Grilla de materias — 2 columnas en tablet, 4 en desktop */}
      {materias.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {materias.map((item) => (
            <MateriaCard key={item.inscripcion_id} item={item} />
          ))}
        </div>
      ) : (
        <ContentCard>
          <AvisoFase mensaje="No se encontraron materias asignadas para tu inscripción." />
        </ContentCard>
      )}

      {/* Nota informativa al pie */}
      <p className="text-xs text-muted-foreground text-center">
        Si hay algún error en tu grupo o docente asignado, comunicalo a la coordinación académica.
      </p>
    </div>
  );
}
