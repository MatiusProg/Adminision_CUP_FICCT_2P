// Servicio de grupos del CUP-FICCT (UC-14 y UC-15).

import { apiClient } from "@/lib/apiClient";

// ── Tipos ─────────────────────────────────────────────────────────────────────

export interface DocenteGrupo {
  id: number;
  nombres: string;
  apellidos: string;
  titulo: string | null;
}

export interface Grupo {
  id: number;
  nombre: string;
  aula: string | null;
  horario: string | null;
  capacidad: number;
  inscritos: number;
  materia: {
    id: number;
    nombre: string;
    codigo: string;
  };
  docente: DocenteGrupo | null;
}

export interface GruposPorMateria {
  materia_id: number;
  materia_nombre: string;
  materia_codigo: string;
  grupos: Grupo[];
}

export interface ResultadoGeneracion {
  total_postulantes: number;
  num_grupos: number;
  total_grupos: number;
  max_alumnos_grupo: number;
  total_inscripciones: number;
  total_examenes: number;
  materias: number;
}

export interface HorarioOpcion {
  codigo: string;
  label: string;
}

export interface GruposResponse {
  data: GruposPorMateria[];
  gestion: { codigo: string; estado: string };
  total_grupos: number;
}

// ── Servicio ──────────────────────────────────────────────────────────────────

export const gruposService = {
  /**
   * Lista grupos de la gestión activa agrupados por materia.
   */
  list() {
    return apiClient.get<GruposResponse>("/grupos");
  },

  /**
   * Ejecuta el algoritmo CEIL para generar grupos automáticamente.
   * Requiere que la gestión esté en fase 'cup_iniciado'.
   */
  generar() {
    return apiClient.post<{ message: string; data: ResultadoGeneracion }>("/grupos/generar");
  },

  /**
   * Actualiza el aula y/o horario de un grupo específico.
   */
  actualizarHorario(id: number, data: { aula?: string; horario?: string }) {
    return apiClient.put<{ message: string; data: Grupo }>(`/grupos/${id}/horario`, data);
  },

  /**
   * Obtiene la lista de horarios disponibles (para el select de la UI).
   */
  horarios() {
    return apiClient.get<{ data: HorarioOpcion[] }>("/grupos/horarios");
  },
};
