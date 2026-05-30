// Servicio de parámetros de configuración del sistema.

import { apiClient } from "@/lib/apiClient";

export interface Configuracion {
  id: number;
  clave: string;
  valor: string;
  descripcion: string | null;
}

export const configuracionService = {
  list() {
    return apiClient.get<{ data: Configuracion[] }>("/configuracion");
  },
  update(clave: string, valor: string) {
    return apiClient.put<{ data: Configuracion }>(`/configuracion/${clave}`, { valor });
  },
};
