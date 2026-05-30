<?php

namespace App\Services;

use App\Models\Carrera;
use App\Models\Gestion;
use App\Models\Pago;
use App\Models\Postulante;

/**
 * Servicio que calcula los KPIs del panel de control (UC-09).
 * Todos los indicadores se acotan a la gestión activa.
 */
class DashboardService
{
    /**
     * Devuelve los indicadores clave del proceso de admisión de la gestión activa.
     *
     * @return array<string,mixed>
     */
    public function kpis(): array
    {
        $gestion = Gestion::actual();

        // Sin gestión activa devolvemos ceros para que el front no rompa.
        if (! $gestion) {
            return [
                'gestion'            => null,
                'total_postulantes'  => 0,
                'por_estado'         => [],
                'pagos_completados'  => 0,
                'monto_recaudado'    => 0,
                'cupos_por_carrera'  => [],
            ];
        }

        $gestionId = $gestion->id;

        // Total de postulantes de la gestión.
        $total = Postulante::where('gestion_id', $gestionId)->count();

        // Conteo agrupado por estado (confirmado, aprobado, etc.).
        $porEstado = Postulante::where('gestion_id', $gestionId)
            ->selectRaw('estado, COUNT(*) as total')
            ->groupBy('estado')
            ->pluck('total', 'estado');

        // Pagos completados y monto recaudado en la gestión.
        $pagosCompletados = Pago::where('gestion_id', $gestionId)->where('estado', 'completado')->count();
        $montoRecaudado   = (float) Pago::where('gestion_id', $gestionId)->where('estado', 'completado')->sum('monto');

        // Ocupación de cupos por carrera (1ra opción vs cupo máximo).
        $cuposPorCarrera = Carrera::orderBy('nombre')->get()->map(function ($carrera) use ($gestionId) {
            $inscritos = Postulante::where('gestion_id', $gestionId)
                ->where('carrera_1ra_opcion_id', $carrera->id)
                ->count();

            return [
                'carrera'      => $carrera->nombre,
                'codigo'       => $carrera->codigo,
                'cupo_maximo'  => $carrera->cupo_maximo,
                'inscritos'    => $inscritos,
                'disponibles'  => max(0, $carrera->cupo_maximo - $inscritos),
            ];
        });

        return [
            'gestion'           => $gestion->codigo,
            'total_postulantes' => $total,
            'por_estado'        => $porEstado,
            'pagos_completados' => $pagosCompletados,
            'monto_recaudado'   => $montoRecaudado,
            'cupos_por_carrera' => $cuposPorCarrera,
        ];
    }
}
