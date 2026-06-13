// Servicio de gestión de usuarios internos del sistema (UC-02).
// Docente excluido — se gestiona desde /docentes con perfil completo.

import { apiClient } from "@/lib/apiClient";

// Docente excluido intencionalmente de los roles gestionables desde /usuarios.
export type RolInterno = "admin" | "coordinador_academico" | "autoridad";

export interface Usuario {
  id: number;
  name: string;
  email: string;
  rol: RolInterno;
  activo: boolean;
}

export interface UsuarioInput {
  name: string;
  email: string;
  password: string;
  rol: RolInterno;
}

export interface UsuarioUpdateInput {
  name?: string;
  email?: string;
  password?: string;
  rol?: RolInterno;
}

export interface PaginatedUsuarios {
  data: Usuario[];
  meta: {
    current_page: number;
    last_page: number;
    total: number;
    per_page: number;
  };
}

export const usuariosService = {
  list(params?: { search?: string; rol?: string; activo?: boolean; page?: number }) {
    const query = new URLSearchParams();
    if (params?.search) query.set("search", params.search);
    if (params?.rol) query.set("rol", params.rol);
    if (params?.activo !== undefined) query.set("activo", String(params.activo));
    if (params?.page) query.set("page", String(params.page));
    const qs = query.toString();
    return apiClient.get<PaginatedUsuarios>(`/usuarios${qs ? `?${qs}` : ""}`);
  },
  create(data: UsuarioInput) {
    return apiClient.post<{ data: Usuario }>("/usuarios", data);
  },
  update(id: number, data: UsuarioUpdateInput) {
    return apiClient.put<{ data: Usuario }>(`/usuarios/${id}`, data);
  },
  desactivar(id: number) {
    return apiClient.put<{ message: string }>(`/usuarios/${id}/desactivar`);
  },
  reactivar(id: number) {
    return apiClient.put<{ message: string }>(`/usuarios/${id}/reactivar`);
  },
};