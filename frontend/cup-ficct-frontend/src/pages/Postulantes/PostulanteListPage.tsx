// Lista de postulantes (UC-04): tabla con búsqueda, filtro por estado y paginación.
// Incluye: badges de estado coloreados, skeleton de carga, diálogo de confirmación
// de eliminación (reemplaza el window.confirm del navegador), y hover en filas.

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Search, Pencil, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { postulanteService, type Postulante } from "@/services/postulanteService";
import { useAuth } from "@/context/AuthContext";
import { useConfirm } from "@/context/useConfirm";
import { EstadoBadge, SkeletonRows, EmptyState, PageHeader, ContentCard } from "@/components/ui-shared";
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

export function PostulanteListPage() {
  const { hasRole } = useAuth();
  const navigate = useNavigate();
  const confirm = useConfirm();

  const [postulantes, setPostulantes] = useState<Postulante[]>([]);
  const [search, setSearch] = useState("");
  const [estado, setEstado] = useState<string>("todos");
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);

  const puedeEditar = hasRole("admin", "coordinador_academico");

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

  useEffect(() => {
    cargar(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estado]);

  async function eliminar(p: Postulante) {
    // Diálogo de confirmación con el componente de shadcn (reemplaza window.confirm).
    const ok = await confirm({
      title: "¿Eliminar postulante?",
      description: `Se eliminará a ${p.nombres} ${p.apellidos} (CI: ${p.ci}). Esta acción no se puede deshacer.`,
      confirmText: "Eliminar",
      cancelText: "Cancelar",
      destructive: true,
    });
    if (!ok) return;

    try {
      await postulanteService.remove(p.id);
      toast.success("Postulante eliminado correctamente.");
      cargar();
    } catch {
      toast.error("No se pudo eliminar el postulante.");
    }
  }

  const colSpan = puedeEditar ? 6 : 5;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Postulantes"
        description={total > 0 ? `${total} postulante${total === 1 ? "" : "s"} en la gestión activa` : undefined}
      >
        {puedeEditar && (
          <Button onClick={() => navigate("/postulantes/nuevo")}>
            <Plus className="mr-2 h-4 w-4" />
            Registrar postulante
          </Button>
        )}
      </PageHeader>

      {/* Barra de búsqueda y filtro */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="search"
            name="search"
            className="pl-9 h-10"
            placeholder="Buscar por nombre, apellido o CI..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && cargar(1)}
          />
        </div>
        <Select value={estado} onValueChange={setEstado}>
          <SelectTrigger className="w-[190px] h-10">
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
        <Button variant="outline" onClick={() => cargar(1)} className="h-10">
          Buscar
        </Button>
      </div>

      {/* Tabla */}
      <ContentCard>
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead className="font-semibold">CI</TableHead>
              <TableHead className="font-semibold">Nombres</TableHead>
              <TableHead className="font-semibold">Apellidos</TableHead>
              <TableHead className="font-semibold">1ra opción</TableHead>
              <TableHead className="font-semibold">Estado</TableHead>
              {puedeEditar && (
                <TableHead className="text-right font-semibold">Acciones</TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <SkeletonRows rows={8} cols={colSpan} />
            ) : postulantes.length === 0 ? (
              <EmptyState message="No hay postulantes registrados." cols={colSpan} />
            ) : (
              postulantes.map((p) => (
                <TableRow
                  key={p.id}
                  className="transition-colors hover:bg-muted/30"
                >
                  <TableCell className="font-mono text-sm">{p.ci}</TableCell>
                  <TableCell>{p.nombres}</TableCell>
                  <TableCell>{p.apellidos}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {p.carrera_1ra_opcion?.nombre ?? "—"}
                  </TableCell>
                  <TableCell>
                    <EstadoBadge estado={p.estado} />
                  </TableCell>
                  {puedeEditar && (
                    <TableCell>
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 hover:bg-primary/10 hover:text-primary"
                          onClick={() => navigate(`/postulantes/${p.id}/editar`)}
                          title="Editar"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive"
                          onClick={() => eliminar(p)}
                          title="Eliminar"
                        >
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
      </ContentCard>

      {/* Paginación */}
      {!loading && total > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            Página <span className="font-medium text-foreground">{page}</span> de{" "}
            <span className="font-medium text-foreground">{lastPage}</span> ·{" "}
            {total} postulante{total === 1 ? "" : "s"}
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              disabled={page <= 1}
              onClick={() => cargar(page - 1)}
              title="Página anterior"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="min-w-[2.5rem] text-center text-sm font-medium">{page}</span>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              disabled={page >= lastPage}
              onClick={() => cargar(page + 1)}
              title="Página siguiente"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
