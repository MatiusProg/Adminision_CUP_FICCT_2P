<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Carrera;
use App\Models\CupoAsignado;
use App\Models\Gestion;
use App\Services\AsignacionCuposService;
use App\Services\AuditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Asignación de cupos por carrera (UC-16).
 *
 * Rutas:
 *   POST /api/cupos/asignar          → ejecutar algoritmo de ranking
 *   GET  /api/cupos/ranking          → ver resultados con filtros
 *   GET  /api/cupos/resumen          → resumen por carrera (KPIs)
 */
class CupoController extends Controller
{
    public function __construct(
        private AsignacionCuposService $servicio,
        private AuditService $audit
    ) {
    }

    /**
     * Ejecuta el algoritmo de asignación de cupos.
     * Ordena aprobados por promedio DESC y asigna a 1ra o 2da opción de carrera.
     * Si ya existe un resultado previo, lo reemplaza (idempotente).
     * Ruta: POST /api/cupos/asignar
     */
    public function asignar(Request $request): JsonResponse
    {
        $gestion = Gestion::actual();
        if (! $gestion) {
            return response()->json(['message' => 'No hay una gestión activa.'], 422);
        }

        try {
            $resultado = $this->servicio->asignarCupos($gestion);

            $this->audit->log('asignar_cupos', 'Gestion', $gestion->id, [
                'admitidos'    => $resultado['admitidos'],
                'no_admitidos' => $resultado['no_admitidos'],
            ], $request);

            return response()->json([
                'message' => "Cupos asignados correctamente para la gestión {$gestion->codigo}.",
                'data'    => $resultado,
            ], 201);
        } catch (\RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }
    }

    /**
     * Devuelve el ranking de cupos asignados con filtros opcionales.
     * Parámetros: ?carrera_id=, ?opcion=primera|segunda|no_admitido
     * Ruta: GET /api/cupos/ranking
     */
    public function ranking(Request $request): JsonResponse
    {
        $gestion = Gestion::actual();
        if (! $gestion) {
            return response()->json(['message' => 'No hay una gestión activa.', 'data' => []], 200);
        }

        $carreraId = $request->query('carrera_id') ? (int) $request->query('carrera_id') : null;
        $opcion    = $request->query('opcion', 'todos');

        $ranking = $this->servicio->obtenerRanking($gestion, $carreraId, $opcion);

        $data = collect($ranking->items())->map(function (CupoAsignado $cupo) {
            return [
                'posicion_ranking' => $cupo->posicion_ranking,
                'promedio_general' => (float) $cupo->promedio_general,
                'opcion_asignada'  => $cupo->opcion_asignada,
                'postulante' => [
                    'id'        => $cupo->postulante->id,
                    'ci'        => $cupo->postulante->ci,
                    'nombres'   => $cupo->postulante->nombres,
                    'apellidos' => $cupo->postulante->apellidos,
                    'estado'    => $cupo->postulante->estado,
                ],
                'carrera' => $cupo->carrera ? [
                    'id'     => $cupo->carrera->id,
                    'nombre' => $cupo->carrera->nombre,
                    'codigo' => $cupo->carrera->codigo,
                ] : null,
            ];
        });

        return response()->json([
            'data' => $data,
            'meta' => [
                'current_page' => $ranking->currentPage(),
                'last_page'    => $ranking->lastPage(),
                'total'        => $ranking->total(),
                'per_page'     => $ranking->perPage(),
            ],
            'gestion' => ['codigo' => $gestion->codigo, 'estado' => $gestion->estado],
        ]);
    }

    /**
     * Devuelve el resumen de cupos por carrera (KPIs para la UI).
     * Ruta: GET /api/cupos/resumen
     */
    public function resumen(): JsonResponse
    {
        $gestion = Gestion::actual();
        if (! $gestion) {
            return response()->json(['message' => 'No hay una gestión activa.', 'data' => []], 200);
        }

        $carreras = Carrera::orderBy('nombre')->get();

        $resumen = $carreras->map(function (Carrera $carrera) use ($gestion) {
            $admitidosPrimera = CupoAsignado::where('gestion_id', $gestion->id)
                ->where('carrera_id', $carrera->id)
                ->where('opcion_asignada', 'primera')
                ->count();

            $admitidosSegunda = CupoAsignado::where('gestion_id', $gestion->id)
                ->where('carrera_id', $carrera->id)
                ->where('opcion_asignada', 'segunda')
                ->count();

            $total = $admitidosPrimera + $admitidosSegunda;

            return [
                'carrera'         => $carrera->nombre,
                'codigo'          => $carrera->codigo,
                'cupo_maximo'     => $carrera->cupo_maximo,
                'admitidos_total' => $total,
                'primera_opcion'  => $admitidosPrimera,
                'segunda_opcion'  => $admitidosSegunda,
                'cupos_libres'    => max(0, $carrera->cupo_maximo - $total),
                'porcentaje'      => $carrera->cupo_maximo > 0
                    ? round(($total / $carrera->cupo_maximo) * 100, 1)
                    : 0,
            ];
        });

        $totalNoAdmitidos = CupoAsignado::where('gestion_id', $gestion->id)
            ->where('opcion_asignada', 'no_admitido')
            ->count();

        return response()->json([
            'data'            => $resumen,
            'no_admitidos'    => $totalNoAdmitidos,
            'gestion'         => ['codigo' => $gestion->codigo, 'estado' => $gestion->estado],
        ]);
    }
}
