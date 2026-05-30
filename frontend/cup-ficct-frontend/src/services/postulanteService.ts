// Servicio de postulantes: encapsula las llamadas a la API.

import { apiClient } from "@/lib/apiClient";

export interface Postulante {
  id: number;
  gestion_id: number;
  user_id: number | null;
  ci: string;
  nombres: string;
  apellidos: string;
  fecha_nacimiento: string;
  sexo: "M" | "F";
  direccion: string | null;
  telefono: string | null;
  email: string | null;
  colegio: string | null;
  ciudad: string | null;
  titulo_bachiller: boolean;
  estado: "confirmado" | "aprobado" | "reprobado" | "admitido" | "no_admitido";
  carrera_1ra_opcion_id: number;
  carrera_2da_opcion_id: number;
  carrera_1ra_opcion?: { id: number; nombre: string; codigo: string };
  carrera_2da_opcion?: { id: number; nombre: string; codigo: string };
}

// Datos del formulario que viajan a Stripe (aún sin id; el postulante no existe).
export interface PostulanteFormData {
  carrera_1ra_opcion_id: number;
  carrera_2da_opcion_id: number;
  ci: string;
  nombres: string;
  apellidos: string;
  fecha_nacimiento: string;
  sexo: "M" | "F";
  direccion?: string;
  telefono?: string;
  email?: string;
  colegio?: string;
  ciudad?: string;
  titulo_bachiller: boolean;
}

// Respuesta paginada estándar de Laravel.
export interface Paginated<T> {
  data: T[];
  meta: { current_page: number; last_page: number; total: number };
}

interface ListParams {
  search?: string;
  estado?: string;
  page?: number;
  perPage?: number;
}

export const postulanteService = {
  // Lista con búsqueda, filtro y paginación.
  list(params: ListParams = {}) {
    const q = new URLSearchParams();
    if (params.search) q.set("search", params.search);
    if (params.estado) q.set("estado", params.estado);
    if (params.page) q.set("page", String(params.page));
    if (params.perPage) q.set("per_page", String(params.perPage));
    const qs = q.toString();
    return apiClient.get<Paginated<Postulante>>(`/postulantes${qs ? `?${qs}` : ""}`);
  },

  get(id: number) {
    return apiClient.get<{ data: Postulante }>(`/postulantes/${id}`);
  },

  update(id: number, data: Partial<PostulanteFormData> & { estado?: string }) {
    return apiClient.put<{ data: Postulante }>(`/postulantes/${id}`, data);
  },

  remove(id: number) {
    return apiClient.delete<{ message: string }>(`/postulantes/${id}`);
  },

  // Inicia el pago: valida el formulario y devuelve la URL de Stripe Checkout.
  iniciarPago(data: PostulanteFormData) {
    return apiClient.post<{ checkout_url: string; pago_id: number }>(
      "/pagos/checkout-session",
      data
    );
  },
};
