// Gestión de carreras (UC-10): tabla + edición inline del cupo máximo.

import { useEffect, useState } from "react";
import { GraduationCap, Save } from "lucide-react";
import { toast } from "sonner";
import { carrerasService, type Carrera } from "@/services/carrerasService";
import { PageHeader, ContentCard, SkeletonRows } from "@/components/ui-shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export function CarrerasPage() {
  const [carreras, setCarreras] = useState<Carrera[]>([]);
  const [loading, setLoading] = useState(true);
  const [editCupo, setEditCupo] = useState<Record<number, number>>({});
  const [saving, setSaving] = useState<Record<number, boolean>>({});

  async function cargar() {
    setLoading(true);
    try {
      const res = await carrerasService.list();
      setCarreras(res.data);
    } catch {
      toast.error("No se pudieron cargar las carreras.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { cargar(); }, []);

  async function guardarCupo(c: Carrera) {
    const nuevo = editCupo[c.id];
    if (nuevo === undefined || nuevo === c.cupo_maximo) return;
    setSaving((s) => ({ ...s, [c.id]: true }));
    try {
      await carrerasService.update(c.id, { cupo_maximo: nuevo });
      toast.success(`Cupo de ${c.nombre} actualizado a ${nuevo}.`);
      cargar();
    } catch {
      toast.error("No se pudo actualizar el cupo.");
    } finally {
      setSaving((s) => ({ ...s, [c.id]: false }));
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Carreras"
        description="Catálogo de carreras de la FICCT y sus cupos máximos por gestión."
      />

      <ContentCard>
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead className="font-semibold">Código</TableHead>
              <TableHead className="font-semibold">Carrera</TableHead>
              <TableHead className="font-semibold">Cupo máximo</TableHead>
              <TableHead className="text-right font-semibold">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <SkeletonRows rows={4} cols={4} />
            ) : (
              carreras.map((c) => (
                <TableRow key={c.id} className="transition-colors hover:bg-muted/30">
                  <TableCell>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                      <GraduationCap className="h-3.5 w-3.5" />
                      {c.codigo}
                    </span>
                  </TableCell>
                  <TableCell className="font-medium">{c.nombre}</TableCell>
                  <TableCell>
                    <Input
                      id={`cupo-${c.id}`}
                      name={`cupo_${c.codigo}`}
                      type="number"
                      min={1}
                      className="h-9 w-28"
                      defaultValue={c.cupo_maximo}
                      onChange={(e) =>
                        setEditCupo((prev) => ({ ...prev, [c.id]: Number(e.target.value) }))
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => guardarCupo(c)}
                        disabled={saving[c.id]}
                        className="h-9 hover:bg-primary/10 hover:text-primary hover:border-primary/30"
                      >
                        <Save className="mr-1.5 h-3.5 w-3.5" />
                        {saving[c.id] ? "Guardando..." : "Guardar"}
                      </Button>
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
