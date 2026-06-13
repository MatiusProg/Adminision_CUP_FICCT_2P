// ============================================================
// ARCHIVO 1: src/services/cuposService.ts
// ============================================================

import { apiClient } from "@/lib/apiClient";

export type OpcionAsignada = "primera" | "segunda" | "no_admitido";

export interface CupoRanking {
  posicion_ranking: number;
  promedio_general: number;
  opcion_asignada: OpcionAsignada;
  postulante: {
    id: number; ci: string; nombres: string; apellidos: string; estado: string;
  };
  carrera: { id: number; nombre: string; codigo: string } | null;
}

export interface ResumenCarrera {
  carrera: string; codigo: string; cupo_maximo: number;
  admitidos_total: number; primera_opcion: number; segunda_opcion: number;
  cupos_libres: number; porcentaje: number;
}

export interface ResultadoAsignacion {
  total_aprobados: number; admitidos: number; no_admitidos: number;
  por_carrera: ResumenCarrera[];
}

export interface RankingResponse {
  data: CupoRanking[];
  meta: { current_page: number; last_page: number; total: number; per_page: number };
  gestion: { codigo: string; estado: string };
}

export interface ResumenResponse {
  data: ResumenCarrera[];
  no_admitidos: number;
  gestion: { codigo: string; estado: string };
}

export const cuposService = {
  asignar() {
    return apiClient.post<{ message: string; data: ResultadoAsignacion }>("/cupos/asignar");
  },
  ranking(params?: { carrera_id?: number; opcion?: string; page?: number }) {
    const q = new URLSearchParams();
    if (params?.carrera_id) q.set("carrera_id", String(params.carrera_id));
    if (params?.opcion && params.opcion !== "todos") q.set("opcion", params.opcion);
    if (params?.page) q.set("page", String(params.page));
    const qs = q.toString();
    return apiClient.get<RankingResponse>(`/cupos/ranking${qs ? `?${qs}` : ""}`);
  },
  resumen() {
    return apiClient.get<ResumenResponse>("/cupos/resumen");
  },
};
