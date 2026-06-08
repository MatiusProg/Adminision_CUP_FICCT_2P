// Panel de control (UC-09): KPIs con animación escalonada de entrada,
// tarjetas con microinteracción de hover, tabla de cupos con barra de progreso.

import { useEffect, useState } from "react";
import { Users, CreditCard, Wallet, GraduationCap, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { dashboardService, type Kpis, type CupoCarrera } from "@/services/dashboardService";
import { PageHeader, ContentCard } from "@/components/ui-shared";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

// Tarjeta KPI con ícono, valor, etiqueta y animación escalonada de entrada.
function KpiCard({
  icon: Icon,
  label,
  value,
  sub,
  delay = 0,
}: {
  icon: typeof Users;
  label: string;
  value: string | number;
  sub?: string;
  delay?: number;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(t);
  }, [delay]);

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-xl border bg-card p-6 shadow-sm",
        "transition-all duration-500 ease-out",
        "hover:shadow-md hover:-translate-y-0.5",
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
      )}
    >
      {/* Resplandor de fondo al hover */}
      <div className="pointer-events-none absolute inset-0 rounded-xl bg-primary/5 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

      <div className="relative flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-2 font-heading text-3xl font-bold tracking-tight">{value}</p>
          {sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
        </div>
        <div className="rounded-xl bg-primary/10 p-3 text-primary transition-transform duration-300 group-hover:scale-110">
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
}

// Fila de cupo con barra de progreso visual.
function CupoRow({ c }: { c: CupoCarrera }) {
  const pct = c.cupo_maximo > 0 ? Math.min((c.inscritos / c.cupo_maximo) * 100, 100) : 0;
  const color =
    pct >= 90
      ? "bg-destructive"
      : pct >= 70
      ? "bg-amber-500"
      : "bg-primary";

  return (
    <TableRow className="transition-colors hover:bg-muted/30">
      <TableCell className="font-medium">{c.carrera}</TableCell>
      <TableCell className="text-center">{c.cupo_maximo}</TableCell>
      <TableCell className="text-center">{c.inscritos}</TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
            <div
              className={cn("h-full rounded-full transition-all duration-700", color)}
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="w-10 text-right text-xs text-muted-foreground">
            {Math.round(pct)}%
          </span>
        </div>
      </TableCell>
      <TableCell className="text-center font-medium">{c.disponibles}</TableCell>
    </TableRow>
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
    return (
      <div className="space-y-6">
        <PageHeader title="Panel de control" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      </div>
    );
  }

  if (!kpis || !kpis.gestion) {
    return (
      <div className="flex h-64 items-center justify-center text-muted-foreground">
        No hay una gestión activa configurada.
      </div>
    );
  }

  const confirmados = kpis.por_estado?.["confirmado"] ?? 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Panel de control"
        description={`Resumen de la gestión ${kpis.gestion}`}
      />

      {/* KPIs — animación escalonada: cada tarjeta entra 100ms después de la anterior */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          icon={Users}
          label="Postulantes totales"
          value={kpis.total_postulantes}
          sub={`${confirmados} confirmados`}
          delay={0}
        />
        <KpiCard
          icon={CreditCard}
          label="Pagos completados"
          value={kpis.pagos_completados}
          delay={100}
        />
        <KpiCard
          icon={Wallet}
          label="Monto recaudado"
          value={`Bs ${kpis.monto_recaudado.toLocaleString("es-BO")}`}
          delay={200}
        />
        <KpiCard
          icon={GraduationCap}
          label="Carreras activas"
          value={kpis.cupos_por_carrera.length}
          delay={300}
        />
      </div>

      {/* Ocupación de cupos por carrera */}
      <ContentCard>
        <div className="flex items-center gap-2 border-b p-4">
          <TrendingUp className="h-4 w-4 text-primary" />
          <h2 className="font-heading text-sm font-semibold">Ocupación por carrera</h2>
        </div>
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead className="font-semibold">Carrera</TableHead>
              <TableHead className="text-center font-semibold">Cupo máx.</TableHead>
              <TableHead className="text-center font-semibold">Inscritos</TableHead>
              <TableHead className="font-semibold">Ocupación</TableHead>
              <TableHead className="text-center font-semibold">Disponibles</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {kpis.cupos_por_carrera.map((c) => (
              <CupoRow key={c.codigo} c={c} />
            ))}
          </TableBody>
        </Table>
      </ContentCard>
    </div>
  );
}
