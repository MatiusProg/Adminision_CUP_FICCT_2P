// Servicio de gestiones (períodos académicos).

import { apiClient } from "@/lib/apiClient";

export type EstadoGestion =
  | "inscripciones_abiertas"
  | "cup_iniciado"
  | "grupos_generados"
  | "docentes_asignados"
  | "en_curso"
  | "finalizada";

export interface Gestion {
  id: number;
  codigo: string;
  anio: number;
  periodo: number;
  estado: EstadoGestion;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  es_actual: boolean;
}

export type GestionInput = {
  codigo: string;
  anio: number;
  periodo: number;
  fecha_inicio?: string;
  fecha_fin?: string;
};

export const gestionesService = {
  list() {
    return apiClient.get<{ data: Gestion[] }>("/gestiones");
  },
  actual() {
    return apiClient.get<{ data: Gestion | null }>("/gestiones/actual");
  },
  create(data: GestionInput) {
    return apiClient.post<{ data: Gestion }>("/gestiones", data);
  },
  updateEstado(id: number, estado: EstadoGestion) {
    return apiClient.put<{ data: Gestion }>(`/gestiones/${id}/estado`, { estado });
  },
  activar(id: number) {
    return apiClient.put<{ data: Gestion }>(`/gestiones/${id}/activar`, {});
  },
};
