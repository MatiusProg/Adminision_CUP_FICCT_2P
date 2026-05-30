// Configuración del sistema (UC-08): edición de parámetros clave/valor.

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { configuracionService, type Configuracion } from "@/services/configuracionService";
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

export function ConfiguracionPage() {
  const [params, setParams] = useState<Configuracion[]>([]);
  const [valores, setValores] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  async function cargar() {
    setLoading(true);
    try {
      const res = await configuracionService.list();
      setParams(res.data);
    } catch {
      toast.error("No se pudo cargar la configuración.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    cargar();
  }, []);

  async function guardar(c: Configuracion) {
    const nuevo = valores[c.clave] ?? c.valor;
    if (nuevo === c.valor) return;
    try {
      await configuracionService.update(c.clave, nuevo);
      toast.success(`Parámetro "${c.clave}" actualizado.`);
      cargar();
    } catch {
      toast.error("No se pudo actualizar el parámetro.");
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Configuración del sistema</h1>

      <div className="overflow-x-auto rounded-2xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Parámetro</TableHead>
              <TableHead>Descripción</TableHead>
              <TableHead>Valor</TableHead>
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
              params.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.clave}</TableCell>
                  <TableCell className="text-muted-foreground">{c.descripcion ?? "—"}</TableCell>
                  <TableCell>
                    <Input
                      className="w-32"
                      defaultValue={c.valor}
                      onChange={(e) =>
                        setValores((prev) => ({ ...prev, [c.clave]: e.target.value }))
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap justify-end gap-2">
                      <Button variant="outline" size="sm" onClick={() => guardar(c)}>
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
