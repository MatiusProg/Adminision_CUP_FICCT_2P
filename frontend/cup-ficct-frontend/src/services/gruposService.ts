// Servicio de grupos del CUP-FICCT (UC-14 y UC-15).

import { apiClient } from "@/lib/apiClient";

export interface DocenteGrupo {
  id: number; nombres: string; apellidos: string; titulo: string | null;
}

export interface DocenteDisponible {
  id: number; nombres: string; apellidos: string; titulo: string | null;
  grado_academico: string; grupos_asignados: number; grupos_disponibles: number;
}

export interface Grupo {
  id: number; nombre: string; aula: string | null; horario: string | null;
  capacidad: number; inscritos: number;
  materia: { id: number; nombre: string; codigo: string };
  docente: DocenteGrupo | null;
}

export interface GruposPorMateria {
  materia_id: number; materia_nombre: string; materia_codigo: string; grupos: Grupo[];
}

export interface ResultadoGeneracion {
  total_postulantes: number; num_grupos: number; total_grupos: number;
  max_alumnos_grupo: number; total_inscripciones: number; total_examenes: number; materias: number;
}

export interface HorarioOpcion { codigo: string; label: string; }

export interface GruposResponse {
  data: GruposPorMateria[];
  gestion: { codigo: string; estado: string };
  total_grupos: number;
}

export interface DocentesDisponiblesResponse {
  data: DocenteDisponible[];
  grupo: { id: number; nombre: string; horario: string | null };
  materia: { codigo: string; nombre: string };
  requisito: string;
}

export const gruposService = {
  list() {
    return apiClient.get<GruposResponse>("/grupos");
  },
  generar() {
    return apiClient.post<{ message: string; data: ResultadoGeneracion }>("/grupos/generar");
  },
  actualizarHorario(id: number, data: { aula?: string; horario?: string }) {
    return apiClient.put<{ message: string; data: Grupo }>(`/grupos/${id}/horario`, data);
  },
  horarios() {
    return apiClient.get<{ data: HorarioOpcion[] }>("/grupos/horarios");
  },
  // UC-15: docentes disponibles para un grupo (con validaciones aplicadas en servidor)
  docentesDisponibles(grupoId: number) {
    return apiClient.get<DocentesDisponiblesResponse>(`/grupos/${grupoId}/docentes-disponibles`);
  },
  // UC-15: asignar docente a grupo
  asignarDocente(grupoId: number, docenteId: number) {
    return apiClient.put<{ message: string; data: Grupo }>(`/grupos/${grupoId}/asignar-docente`, { docente_id: docenteId });
  },
  // UC-15: desasignar docente de grupo
  desasignarDocente(grupoId: number) {
    return apiClient.delete<{ message: string }>(`/grupos/${grupoId}/docente`);
  },
};