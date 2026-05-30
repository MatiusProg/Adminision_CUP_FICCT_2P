// Gestión de carreras (UC-10): tabla + edición inline del cupo máximo.

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { carrerasService, type Carrera } from "@/services/carrerasService";
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
  // Edición del cupo por fila (id -> nuevo valor temporal).
  const [editCupo, setEditCupo] = useState<Record<number, number>>({});

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

  useEffect(() => {
    cargar();
  }, []);

  async function guardarCupo(c: Carrera) {
    const nuevo = editCupo[c.id];
    if (nuevo === undefined || nuevo === c.cupo_maximo) return;
    try {
      await carrerasService.update(c.id, { cupo_maximo: nuevo });
      toast.success(`Cupo de ${c.nombre} actualizado.`);
      cargar();
    } catch {
      toast.error("No se pudo actualizar el cupo.");
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Carreras</h1>

      <div className="overflow-x-auto rounded-2xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código</TableHead>
              <TableHead>Nombre</TableHead>
              <TableHead>Cupo máximo</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                  Cargando...
                </TableCell>
              </TableRow>
            ) : (
              carreras.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.codigo}</TableCell>
                  <TableCell>{c.nombre}</TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min={1}
                      className="w-28"
                      defaultValue={c.cupo_maximo}
                      onChange={(e) =>
                        setEditCupo((prev) => ({ ...prev, [c.id]: Number(e.target.value) }))
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap justify-end gap-2">
                      <Button variant="outline" size="sm" onClick={() => guardarCupo(c)}>
                        Guardar
                      </Button>
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
