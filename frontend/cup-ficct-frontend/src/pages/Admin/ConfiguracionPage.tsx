// Configuración del sistema (UC-08): edición de parámetros clave/valor.

import { useEffect, useState } from "react";
import { Settings2, Save } from "lucide-react";
import { toast } from "sonner";
import { configuracionService, type Configuracion } from "@/services/configuracionService";
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

export function ConfiguracionPage() {
  const [params, setParams] = useState<Configuracion[]>([]);
  const [valores, setValores] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const clavesProtegidas = ['peso_examen_1', 'peso_examen_2', 'peso_examen_3'];

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

  useEffect(() => { cargar(); }, []);

  async function guardar(c: Configuracion) {
    const nuevo = valores[c.clave] ?? c.valor;
    if (nuevo === c.valor) return;
    setSaving((s) => ({ ...s, [c.clave]: true }));
    try {
      await configuracionService.update(c.clave, nuevo);
      toast.success(`Parámetro "${c.clave}" actualizado.`);
      cargar();
    } catch {
      toast.error("No se pudo actualizar el parámetro.");
    } finally {
      setSaving((s) => ({ ...s, [c.clave]: false }));
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Configuración del sistema"
        description="Parámetros globales que controlan el comportamiento del CUP."
      />

      <ContentCard>
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead className="font-semibold">Parámetro</TableHead>
              <TableHead className="font-semibold">Descripción</TableHead>
              <TableHead className="font-semibold">Valor</TableHead>
              <TableHead className="text-right font-semibold">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <SkeletonRows rows={7} cols={4} />
            ) : (
              params.map((c) => {
                const esProtegida = clavesProtegidas.includes(c.clave);
                return (
                  <TableRow key={c.id} className="transition-colors hover:bg-muted/30">
                    <TableCell>
                      <span className="inline-flex items-center gap-1.5 rounded-md bg-muted px-2 py-1 font-mono text-xs font-medium">
                        <Settings2 className="h-3 w-3 text-muted-foreground" />
                        {c.clave}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {c.descripcion ?? "—"}
                    </TableCell>
                    <TableCell>
                      <Input
                        id={`param-${c.clave}`}
                        name={c.clave}
                        className="h-9 w-32"
                        defaultValue={c.valor}
                        disabled={esProtegida}
                        onChange={(e) =>
                          setValores((prev) => ({ ...prev, [c.clave]: e.target.value }))
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => guardar(c)}
                          disabled={saving[c.clave] || esProtegida}
                          className="h-9 hover:bg-primary/10 hover:text-primary hover:border-primary/30"
                        >
                          <Save className="mr-1.5 h-3.5 w-3.5" />
                          {saving[c.clave] ? "Guardando..." : esProtegida ? "Solo lectura" : "Guardar"}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </ContentCard>
    </div>
  );
}
