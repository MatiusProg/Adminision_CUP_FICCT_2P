// Servicio del panel de control (KPIs).

import { apiClient } from "@/lib/apiClient";

export interface CupoCarrera {
  carrera: string;
  codigo: string;
  cupo_maximo: number;
  inscritos: number;
  disponibles: number;
}

export interface Kpis {
  gestion: string | null;
  total_postulantes: number;
  por_estado: Record<string, number>;
  pagos_completados: number;
  monto_recaudado: number;
  cupos_por_carrera: CupoCarrera[];
}

export const dashboardService = {
  kpis() {
    return apiClient.get<{ data: Kpis }>("/dashboard/kpis");
  },
};
