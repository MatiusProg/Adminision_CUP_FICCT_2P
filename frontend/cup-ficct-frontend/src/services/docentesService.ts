// Servicio de gestión de docentes del CUP-FICCT (UC-11).

import { apiClient } from "@/lib/apiClient";

export type GradoAcademico = "Licenciatura" | "Maestría" | "Doctorado";

export interface Docente {
  id: number;
  ci: string;
  nombres: string;
  apellidos: string;
  email: string;
  telefono: string | null;
  titulo: string | null;
  grado_academico: GradoAcademico;
  diplomado_docencia: boolean;
  activo: boolean;
  user_id: number | null;
  user?: { id: number; email: string; name: string } | null;
}

export interface DocenteInput {
  ci: string;
  nombres: string;
  apellidos: string;
  email: string;
  telefono?: string;
  titulo?: string;
  grado_academico: GradoAcademico;
  diplomado_docencia?: boolean;
  crear_cuenta?: boolean;
  password?: string;
}

export type DocenteUpdateInput = Partial<Omit<DocenteInput, "crear_cuenta" | "password">>;

export interface PaginatedDocentes {
  data: Docente[];
  meta: {
    current_page: number;
    last_page: number;
    total: number;
    per_page: number;
  };
}

export const docentesService = {
  list(params?: { search?: string; activo?: boolean; page?: number }) {
    const query = new URLSearchParams();
    if (params?.search) query.set("search", params.search);
    if (params?.activo !== undefined) query.set("activo", String(params.activo));
    if (params?.page) query.set("page", String(params.page));
    const qs = query.toString();
    return apiClient.get<PaginatedDocentes>(`/docentes${qs ? `?${qs}` : ""}`);
  },
  show(id: number) {
    return apiClient.get<{ data: Docente }>(`/docentes/${id}`);
  },
  create(data: DocenteInput) {
    return apiClient.post<{ data: Docente }>("/docentes", data);
  },
  update(id: number, data: DocenteUpdateInput) {
    return apiClient.put<{ data: Docente }>(`/docentes/${id}`, data);
  },
  desactivar(id: number) {
    return apiClient.put<{ message: string }>(`/docentes/${id}/desactivar`);
  },
  reactivar(id: number) {
    return apiClient.put<{ message: string }>(`/docentes/${id}/reactivar`);
  },
};