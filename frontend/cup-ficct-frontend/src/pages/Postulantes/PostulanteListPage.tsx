// Lista de postulantes (UC-04): tabla con búsqueda, filtro por estado y paginación.

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Search, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { postulanteService, type Postulante } from "@/services/postulanteService";
import { useAuth } from "@/context/AuthContext";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Etiquetas en español de cada estado del postulante.
const estadoLabels: Record<string, string> = {
  confirmado: "Confirmado",
  aprobado: "Aprobado",
  reprobado: "Reprobado",
  admitido: "Admitido",
  no_admitido: "No admitido",
};

export function PostulanteListPage() {
  const { hasRole } = useAuth();
  const navigate = useNavigate();

  const [postulantes, setPostulantes] = useState<Postulante[]>([]);
  const [search, setSearch] = useState("");
  const [estado, setEstado] = useState<string>("todos");
  const [loading, setLoading] = useState(true);
  // Paginación (Mejora 2): página actual y total de páginas devueltas por el backend.
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);

  // Solo admin y coordinador pueden editar/eliminar; autoridad es lectura.
  const puedeEditar = hasRole("admin", "coordinador_academico");

  // Carga una página concreta. Por defecto, la página actual del estado.
  async function cargar(p: number = page) {
    setLoading(true);
    try {
      const res = await postulanteService.list({
        search: search || undefined,
        estado: estado === "todos" ? undefined : estado,
        page: p,
      });
      setPostulantes(res.data);
      setLastPage(res.meta.last_page);
      setTotal(res.meta.total);
      setPage(res.meta.current_page);
    } catch {
      toast.error("No se pudieron cargar los postulantes.");
    } finally {
      setLoading(false);
    }
  }

  // Recarga desde la página 1 cuando cambia el filtro de estado.
  useEffect(() => {
    cargar(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estado]);

  async function eliminar(p: Postulante) {
    if (!confirm(`¿Eliminar al postulante ${p.nombres} ${p.apellidos}?`)) return;
    try {
      await postulanteService.remove(p.id);
      toast.success("Postulante eliminado correctamente.");
      cargar();
    } catch {
      toast.error("No se pudo eliminar el postulante.");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Postulantes</h1>
        {puedeEditar && (
          <Button onClick={() => navigate("/postulantes/nuevo")}>
            <Plus className="mr-2 h-4 w-4" />
            Registrar postulante
          </Button>
        )}
      </div>

      {/* Barra de búsqueda y filtro */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Buscar por nombre, apellido o CI..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && cargar(1)}
          />
        </div>
        <Select value={estado} onValueChange={setEstado}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los estados</SelectItem>
            <SelectItem value="confirmado">Confirmado</SelectItem>
            <SelectItem value="aprobado">Aprobado</SelectItem>
            <SelectItem value="reprobado">Reprobado</SelectItem>
            <SelectItem value="admitido">Admitido</SelectItem>
            <SelectItem value="no_admitido">No admitido</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={() => cargar(1)}>
          Buscar
        </Button>
      </div>

      {/* Tabla con scroll horizontal en móvil */}
      <div className="overflow-x-auto rounded-2xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>CI</TableHead>
              <TableHead>Nombres</TableHead>
              <TableHead>Apellidos</TableHead>
              <TableHead>1ra opción</TableHead>
              <TableHead>Estado</TableHead>
              {puedeEditar && <TableHead className="text-right">Acciones</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                  Cargando...
                </TableCell>
              </TableRow>
            ) : postulantes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                  No hay postulantes registrados.
                </TableCell>
              </TableRow>
            ) : (
              postulantes.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>{p.ci}</TableCell>
                  <TableCell>{p.nombres}</TableCell>
                  <TableCell>{p.apellidos}</TableCell>
                  <TableCell>{p.carrera_1ra_opcion?.nombre ?? "—"}</TableCell>
                  <TableCell>{estadoLabels[p.estado] ?? p.estado}</TableCell>
                  {puedeEditar && (
                    <TableCell>
                      <div className="flex flex-wrap justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(`/postulantes/${p.id}/editar`)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="destructive" size="sm" onClick={() => eliminar(p)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Controles de paginación (Mejora 2) */}
      {!loading && total > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            Página {page} de {lastPage} · {total} postulante{total === 1 ? "" : "s"}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => cargar(page - 1)}
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= lastPage}
              onClick={() => cargar(page + 1)}
            >
              Siguiente
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
