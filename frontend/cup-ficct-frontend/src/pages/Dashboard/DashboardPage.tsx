// Panel de control (UC-09): tarjetas con los KPIs de la gestión activa.

import { useEffect, useState } from "react";
import { Users, CreditCard, Wallet, GraduationCap } from "lucide-react";
import { toast } from "sonner";
import { dashboardService, type Kpis } from "@/services/dashboardService";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// Tarjeta individual de KPI.
function KpiCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Users;
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-3xl bg-card p-6 shadow-card">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-1 text-2xl font-bold">{value}</p>
        </div>
        <div className="rounded-2xl bg-primary/10 p-3 text-primary">
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
}

export function DashboardPage() {
  const [kpis, setKpis] = useState<Kpis | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dashboardService
      .kpis()
      .then((res) => setKpis(res.data))
      .catch(() => toast.error("No se pudieron cargar los indicadores."))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <p className="text-muted-foreground">Cargando indicadores...</p>;
  }

  if (!kpis || !kpis.gestion) {
    return <p className="text-muted-foreground">No hay una gestión activa configurada.</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Panel de control</h1>
        <p className="text-sm text-muted-foreground">Gestión actual: {kpis.gestion}</p>
      </div>

      {/* Tarjetas principales */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard icon={Users} label="Postulantes totales" value={kpis.total_postulantes} />
        <KpiCard icon={CreditCard} label="Pagos completados" value={kpis.pagos_completados} />
        <KpiCard
          icon={Wallet}
          label="Monto recaudado (BOB)"
          value={kpis.monto_recaudado.toLocaleString("es-BO")}
        />
        <KpiCard
          icon={GraduationCap}
          label="Carreras activas"
          value={kpis.cupos_por_carrera.length}
        />
      </div>

      {/* Ocupación de cupos por carrera */}
      <div className="overflow-x-auto rounded-2xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Carrera</TableHead>
              <TableHead>Cupo máximo</TableHead>
              <TableHead>Inscritos (1ra opción)</TableHead>
              <TableHead>Disponibles</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {kpis.cupos_por_carrera.map((c) => (
              <TableRow key={c.codigo}>
                <TableCell className="font-medium">{c.carrera}</TableCell>
                <TableCell>{c.cupo_maximo}</TableCell>
                <TableCell>{c.inscritos}</TableCell>
                <TableCell>{c.disponibles}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
