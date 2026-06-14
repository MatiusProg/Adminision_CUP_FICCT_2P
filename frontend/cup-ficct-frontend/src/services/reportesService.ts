// Servicio de reportes CUP-FICCT (UC-18 PDF, UC-19 Excel).

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000/api";

export type TipoReporte = "postulantes" | "resultados" | "notas";

export interface FiltrosReporte {
  tipo: TipoReporte;
  estado?: string;
  carrera_id?: number;
  materia_id?: number;
  opcion?: string;
}

export interface PreviewReporte {
  data: Record<string, string>[];
  tipo: TipoReporte;
  gestion: { codigo: string; estado: string };
  total: number;
}

function buildQuery(filtros: FiltrosReporte): string {
  const q = new URLSearchParams();
  q.set("tipo", filtros.tipo);
  if (filtros.estado) q.set("estado", filtros.estado);
  if (filtros.carrera_id) q.set("carrera_id", String(filtros.carrera_id));
  if (filtros.materia_id) q.set("materia_id", String(filtros.materia_id));
  if (filtros.opcion) q.set("opcion", filtros.opcion);
  return q.toString();
}

function getToken(): string {
  return localStorage.getItem("cup_token") ?? "";
}

export const reportesService = {
  /** Vista previa del reporte en JSON. */
  async preview(filtros: FiltrosReporte): Promise<PreviewReporte> {
    const res = await fetch(`${API_URL}/reportes/preview?${buildQuery(filtros)}`, {
      headers: { Authorization: `Bearer ${getToken()}`, Accept: "application/json" },
    });
    if (!res.ok) {
      const json = await res.json();
      throw new Error(json.message ?? "No se pudo cargar la vista previa.");
    }
    return res.json();
  },

  /** Descarga el reporte en PDF. */
  async descargarPdf(filtros: FiltrosReporte): Promise<void> {
    const res = await fetch(`${API_URL}/reportes/pdf?${buildQuery(filtros)}`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    if (!res.ok) throw new Error("No se pudo generar el PDF.");
    const blob = await res.blob();
    const link = document.createElement("a");
    link.href  = URL.createObjectURL(blob);
    link.download = `reporte_${filtros.tipo}.pdf`;
    link.click();
    URL.revokeObjectURL(link.href);
  },

  /** Descarga el reporte en Excel. */
  async descargarExcel(filtros: FiltrosReporte): Promise<void> {
    const res = await fetch(`${API_URL}/reportes/excel?${buildQuery(filtros)}`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    if (!res.ok) throw new Error("No se pudo generar el Excel.");
    const blob = await res.blob();
    const link = document.createElement("a");
    link.href  = URL.createObjectURL(blob);
    link.download = `reporte_${filtros.tipo}.xlsx`;
    link.click();
    URL.revokeObjectURL(link.href);
  },
};
