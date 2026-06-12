// Servicio del portal del postulante (UC-23).
// Endpoints de solo lectura: mis-materias y mis-notas.

import { apiClient } from "@/lib/apiClient";

// ── Tipos de respuesta ────────────────────────────────────────────────────────

export interface MateriaPortal {
  inscripcion_id: number;
  materia: {
    id: number;
    nombre: string;
    codigo: string;
  };
  grupo: {
    id: number;
    nombre: string;
    aula: string;
    horario: string;
  };
  docente: {
    nombres: string;
    apellidos: string;
    titulo: string | null;
  } | null;
}

export interface NotaMateria {
  materia: {
    id: number;
    nombre: string;
    codigo: string;
  };
  notas: {
    examen_1: number | null;
    examen_2: number | null;
    examen_3: number | null;
  };
  promedio: number | null;
  total_notas: number;
  notas_completas: boolean;
}

export interface InfoPostulante {
  nombres: string;
  apellidos: string;
  ci: string;
  estado: string;
}

export interface InfoGestion {
  codigo: string;
  estado: string;
}

export interface MisMateriasResponse {
  data: MateriaPortal[];
  postulante: InfoPostulante;
  gestion: InfoGestion;
}

export interface MisNotasResponse {
  data: NotaMateria[];
  resumen: {
    promedio_general: number | null;
    materias_completas: number;
    total_materias: number;
    estado_postulante: string;
  };
  postulante: InfoPostulante;
  gestion: InfoGestion;
}

// ── Servicio ──────────────────────────────────────────────────────────────────

export const portalService = {
  /**
   * Obtiene los grupos, aulas, horarios y docentes del postulante autenticado.
   * Requiere gestión en fase >= grupos_generados.
   */
  misMaterias() {
    return apiClient.get<MisMateriasResponse>("/postulante/mis-materias");
  },

  /**
   * Obtiene las 3 notas por materia y el promedio ponderado del postulante.
   * Requiere gestión en fase >= en_curso.
   */
  misNotas() {
    return apiClient.get<MisNotasResponse>("/postulante/mis-notas");
  },
};
