// Servicio de notas del CUP-FICCT (UC-12 y UC-13).

import { apiClient } from "@/lib/apiClient";

// ── Tipos ─────────────────────────────────────────────────────────────────────

export interface NotaExamen {
  examen_id: number;
  numero: number;
  nota_id: number | null;
  calificacion: number | string | null;
  peso?: number;
}

export interface FilaPostulanteNotas {
  postulante_id: number;
  ci: string;
  nombres: string;
  apellidos: string;
  estado: string;
  notas: NotaExamen[];
  promedio: number | null;
  notas_completas: boolean;
}

export interface ExamenInfo {
  id: number;
  numero: number;
  peso: number;
}

export interface NotasPorMateriaResponse {
  data: FilaPostulanteNotas[];
  materia: { id: number; nombre: string; codigo: string };
  examenes: ExamenInfo[];
  gestion: { codigo: string; estado: string };
  pesos: { 1: number; 2: number; 3: number };
  total: number;
}

export interface NotaMateriaPostulante {
  materia: { id: number; nombre: string; codigo: string };
  notas: NotaExamen[];
  promedio: number | null;
  notas_completas: boolean;
  aprobada: boolean | null;
}

export interface NotasPorPostulanteResponse {
  data: NotaMateriaPostulante[];
  postulante: {
    id: number; ci: string; nombres: string; apellidos: string; estado: string;
  };
  gestion: { codigo: string };
}

export interface ResultadoCalculo {
  total: number;
  aprobados: number;
  reprobados: number;
  pendientes: number;
}

// ── Servicio ──────────────────────────────────────────────────────────────────

export const notasService = {
  /** UC-12: notas de todos los postulantes para una materia. */
  porMateria(materiaId: number) {
    return apiClient.get<NotasPorMateriaResponse>(`/notas/materia/${materiaId}`);
  },

  /** UC-12: todas las notas de un postulante en las 4 materias. */
  porPostulante(postulanteId: number) {
    return apiClient.get<NotasPorPostulanteResponse>(`/notas/postulante/${postulanteId}`);
  },

  /** UC-12: registrar o actualizar una nota individual. */
  registrar(data: { postulante_id: number; examen_id: number; calificacion: number }) {
    return apiClient.post<{ message: string }>("/notas/registrar", data);
  },

  /** UC-12: registrar varias notas de un examen en un solo request. */
  registrarLote(data: {
    examen_id: number;
    notas: { postulante_id: number; calificacion: number }[];
  }) {
    return apiClient.post<{ message: string; data: { registradas: number } }>(
      "/notas/registrar-lote", data
    );
  },

  /** UC-13: calcular promedio de un postulante específico. */
  calcularPostulante(postulanteId: number) {
    return apiClient.post<{ message: string; data: unknown }>(
      `/notas/calcular/${postulanteId}`
    );
  },

  /** UC-13: calcular promedios de todos los postulantes de la gestión activa. */
  calcularTodos() {
    return apiClient.post<{ message: string; data: ResultadoCalculo }>(
      "/notas/calcular-todos"
    );
  },
};
