// Servicio del portal del docente (UC-17).
// Solo lectura — el docente ve sus grupos, postulantes y notas.

import { apiClient } from "@/lib/apiClient";

export interface GrupoDocente {
  id: number;
  nombre: string;
  aula: string;
  horario: string;
  capacidad: number;
  inscritos: number;
  materia: { id: number; nombre: string; codigo: string };
}

export interface NotaExamenDocente {
  examen_id: number;
  numero: number;
  calificacion: number | string | null;
  peso: number;
}

export interface PostulanteGrupo {
  postulante_id: number;
  ci: string;
  nombres: string;
  apellidos: string;
  estado: string;
  notas: NotaExamenDocente[];
  promedio: number | null;
  notas_completas: boolean;
}

export interface MisGruposResponse {
  data: GrupoDocente[];
  docente: { id: number; nombres: string; apellidos: string; titulo: string | null };
  gestion: { codigo: string; estado: string };
  total_grupos: number;
}

export interface DetalleGrupoResponse {
  data: PostulanteGrupo[];
  grupo: { id: number; nombre: string; aula: string; horario: string; capacidad: number; inscritos: number };
  materia: { id: number; nombre: string; codigo: string };
  examenes: { id: number; numero: number; peso: number }[];
  pesos: { 1: number; 2: number; 3: number };
  docente: { nombres: string; apellidos: string; titulo: string | null };
  gestion: { codigo: string };
}

export const misGruposService = {
  /** Lista los grupos asignados al docente autenticado. */
  list() {
    return apiClient.get<MisGruposResponse>("/docente/mis-grupos");
  },

  /** Detalle de un grupo: postulantes y sus notas en la materia. */
  show(grupoId: number) {
    return apiClient.get<DetalleGrupoResponse>(`/docente/mis-grupos/${grupoId}`);
  },
};
