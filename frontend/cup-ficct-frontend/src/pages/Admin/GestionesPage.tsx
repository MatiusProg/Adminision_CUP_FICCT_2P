// Gestión de períodos académicos: lista, activar y avanzar fase.

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  gestionesService,
  type Gestion,
  type EstadoGestion,
} from "@/services/gestionesService";
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

// Etiquetas en español de cada fase.
const faseLabels: Record<EstadoGestion, string> = {
  inscripciones_abiertas: "Inscripciones abiertas",
  cup_iniciado: "CUP iniciado",
  grupos_generados: "Grupos generados",
  docentes_asignados: "Docentes asignados",
  en_curso: "En curso",
  finalizada: "Finalizada",
};

const FASES = Object.keys(faseLabels) as EstadoGestion[];

export function GestionesPage() {
  const [gestiones, setGestiones] = useState<Gestion[]>([]);
  const [loading, setLoading] = useState(true);

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

  useEffect(() => {
    cargar();
  }, []);

  async function activar(g: Gestion) {
    try {
      await gestionesService.activar(g.id);
      toast.success(`Gestión ${g.codigo} activada.`);
      cargar();
    } catch {
      toast.error("No se pudo activar la gestión.");
    }
  }

  async function cambiarFase(g: Gestion, estado: EstadoGestion) {
    try {
      await gestionesService.updateEstado(g.id, estado);
      toast.success(`Fase de ${g.codigo} actualizada.`);
      cargar();
    } catch (err) {
      // El backend rechaza retrocesos de fase con 422.
      toast.error("No se pudo cambiar la fase (no se permite retroceder).");
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Gestiones</h1>

      <div className="overflow-x-auto rounded-2xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código</TableHead>
              <TableHead>Año</TableHead>
              <TableHead>Período</TableHead>
              <TableHead>Fase</TableHead>
              <TableHead>Activa</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                  Cargando...
                </TableCell>
              </TableRow>
            ) : (
              gestiones.map((g) => (
                <TableRow key={g.id}>
                  <TableCell className="font-medium">{g.codigo}</TableCell>
                  <TableCell>{g.anio}</TableCell>
                  <TableCell>{g.periodo}</TableCell>
                  <TableCell>
                    <Select
                      value={g.estado}
                      onValueChange={(v) => cambiarFase(g, v as EstadoGestion)}
                    >
                      <SelectTrigger className="w-[200px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {FASES.map((f) => (
                          <SelectItem key={f} value={f}>
                            {faseLabels[f]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>{g.es_actual ? "Sí" : "No"}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap justify-end gap-2">
                      {!g.es_actual && (
                        <Button variant="outline" size="sm" onClick={() => activar(g)}>
                          Activar
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
