// Servicio del catálogo de carreras.

import { apiClient } from "@/lib/apiClient";

export interface Carrera {
  id: number;
  nombre: string;
  codigo: string;
  cupo_maximo: number;
}

export type CarreraInput = Omit<Carrera, "id">;

export const carrerasService = {
  list() {
    return apiClient.get<{ data: Carrera[] }>("/carreras");
  },
  create(data: CarreraInput) {
    return apiClient.post<{ data: Carrera }>("/carreras", data);
  },
  update(id: number, data: Partial<CarreraInput>) {
    return apiClient.put<{ data: Carrera }>(`/carreras/${id}`, data);
  },
};
