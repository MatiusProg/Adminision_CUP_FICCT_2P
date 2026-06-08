// Gestión de períodos académicos: lista, activar y avanzar fase.

import { useEffect, useState } from "react";
import { Star, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import {
  gestionesService,
  type Gestion,
  type EstadoGestion,
} from "@/services/gestionesService";
import { PageHeader, ContentCard, SkeletonRows } from "@/components/ui-shared";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

const faseLabels: Record<EstadoGestion, string> = {
  inscripciones_abiertas: "Inscripciones abiertas",
  cup_iniciado: "CUP iniciado",
  grupos_generados: "Grupos generados",
  docentes_asignados: "Docentes asignados",
  en_curso: "En curso",
  finalizada: "Finalizada",
};

// Color de la fase para el badge visual.
const faseColors: Record<EstadoGestion, string> = {
  inscripciones_abiertas: "text-emerald-600 bg-emerald-500/10 border-emerald-500/20",
  cup_iniciado: "text-primary bg-primary/10 border-primary/20",
  grupos_generados: "text-primary bg-primary/10 border-primary/20",
  docentes_asignados: "text-amber-600 bg-amber-500/10 border-amber-500/20",
  en_curso: "text-amber-600 bg-amber-500/10 border-amber-500/20",
  finalizada: "text-muted-foreground bg-muted border-border",
};

const FASES = Object.keys(faseLabels) as EstadoGestion[];

export function GestionesPage() {
  const [gestiones, setGestiones] = useState<Gestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [activando, setActivando] = useState<number | null>(null);

  async function cargar() {
    setLoading(true);
    try {
      const res = await gestionesService.list();
      setGestiones(res.data);
    } catch {
      toast.error("No se pudieron cargar las gestiones.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { cargar(); }, []);

  async function activar(g: Gestion) {
    setActivando(g.id);
    try {
      await gestionesService.activar(g.id);
      toast.success(`Gestión ${g.codigo} activada.`);
      cargar();
    } catch {
      toast.error("No se pudo activar la gestión.");
    } finally {
      setActivando(null);
    }
  }

  async function cambiarFase(g: Gestion, estado: EstadoGestion) {
    try {
      await gestionesService.updateEstado(g.id, estado);
      toast.success(`Fase de ${g.codigo} actualizada.`);
      cargar();
    } catch {
      toast.error("No se pudo cambiar la fase (no se permite retroceder).");
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Gestiones"
        description="Períodos académicos del CUP. Solo puede haber una gestión activa a la vez."
      />

      <ContentCard>
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead className="font-semibold">Código</TableHead>
              <TableHead className="font-semibold">Año</TableHead>
              <TableHead className="font-semibold">Período</TableHead>
              <TableHead className="font-semibold">Fase actual</TableHead>
              <TableHead className="font-semibold">Estado</TableHead>
              <TableHead className="text-right font-semibold">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <SkeletonRows rows={3} cols={6} />
            ) : (
              gestiones.map((g) => (
                <TableRow
                  key={g.id}
                  className={cn(
                    "transition-colors hover:bg-muted/30",
                    g.es_actual && "bg-primary/5 hover:bg-primary/8"
                  )}
                >
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {g.es_actual && (
                        <Star className="h-3.5 w-3.5 fill-primary text-primary" />
                      )}
                      <span className="font-heading font-bold">{g.codigo}</span>
                    </div>
                  </TableCell>
                  <TableCell>{g.anio}</TableCell>
                  <TableCell>{g.periodo}</TableCell>
                  <TableCell>
                    {/* Select para avanzar la fase */}
                    <Select
                      value={g.estado}
                      onValueChange={(v) => cambiarFase(g, v as EstadoGestion)}
                    >
                      <SelectTrigger className="h-8 w-[200px] text-xs">
                        <ChevronRight className="mr-1 h-3 w-3 text-muted-foreground" />
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {FASES.map((f) => (
                          <SelectItem key={f} value={f} className="text-xs">
                            {faseLabels[f]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
                        faseColors[g.estado]
                      )}
                    >
                      {faseLabels[g.estado]}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end">
                      {g.es_actual ? (
                        <span className="text-xs font-medium text-primary">Activa</span>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 hover:bg-primary/10 hover:text-primary hover:border-primary/30"
                          onClick={() => activar(g)}
                          disabled={activando === g.id}
                        >
                          {activando === g.id ? "Activando..." : "Activar"}
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </ContentCard>
    </div>
  );
}
