<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Gestion;
use App\Models\Grupo;
use App\Services\AsignacionGruposService;
use App\Services\AuditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * Gestión de grupos del CUP-FICCT (UC-14 y UC-15 parcial).
 *
 * UC-14: generación automática de grupos con el algoritmo CEIL.
 * UC-15 (parcial): edición de aula/horario y listado de docentes disponibles.
 *
 * Rutas:
 *   GET  /api/grupos                    → listar grupos de la gestión activa
 *   POST /api/grupos/generar            → ejecutar algoritmo CEIL
 *   PUT  /api/grupos/{grupo}/horario    → actualizar aula y/o horario
 *   GET  /api/grupos/resumen            → resumen por materia (para la UI)
 */
class GrupoController extends Controller
{
    public function __construct(
        private AsignacionGruposService $asignacion,
        private AuditService $audit
    ) {
    }

    /**
     * Lista todos los grupos de la gestión activa agrupados por materia.
     * Incluye el docente asignado (si existe) y el conteo de inscritos.
     * Ruta: GET /api/grupos
     */
    public function index(Request $request): JsonResponse
    {
        $gestion = Gestion::actual();

        if (! $gestion) {
            return response()->json([
                'message' => 'No hay una gestión activa.',
                'data'    => [],
            ]);
        }

        $grupos = Grupo::where('gestion_id', $gestion->id)
            ->with(['materia', 'docente'])
            ->withCount('inscripciones')
            ->orderBy('materia_id')
            ->orderBy('nombre')
            ->get()
            ->map(function (Grupo $grupo) {
                return [
                    'id'                  => $grupo->id,
                    'nombre'              => $grupo->nombre,
                    'aula'                => $grupo->aula,
                    'horario'             => $grupo->horario,
                    'capacidad'           => $grupo->capacidad,
                    'inscritos'           => $grupo->inscripciones_count,
                    'materia' => [
                        'id'     => $grupo->materia->id,
                        'nombre' => $grupo->materia->nombre,
                        'codigo' => $grupo->materia->codigo,
                    ],
                    'docente' => $grupo->docente ? [
                        'id'        => $grupo->docente->id,
                        'nombres'   => $grupo->docente->nombres,
                        'apellidos' => $grupo->docente->apellidos,
                        'titulo'    => $grupo->docente->titulo,
                    ] : null,
                ];
            });

        // Agrupar por materia para facilitar la presentación en el frontend.
        $porMateria = $grupos->groupBy('materia.codigo')->map(function ($gruposMateria) {
            $primero = $gruposMateria->first();
            return [
                'materia_id'     => $primero['materia']['id'],
                'materia_nombre' => $primero['materia']['nombre'],
                'materia_codigo' => $primero['materia']['codigo'],
                'grupos'         => $gruposMateria->values(),
            ];
        })->values();

        return response()->json([
            'data'    => $porMateria,
            'gestion' => [
                'codigo' => $gestion->codigo,
                'estado' => $gestion->estado,
            ],
            'total_grupos' => $grupos->count(),
        ]);
    }

    /**
     * Ejecuta el algoritmo CEIL para generar grupos automáticamente.
     * Crea grupos + inscripciones + exámenes en una sola transacción.
     * Ruta: POST /api/grupos/generar
     */
    public function generar(Request $request): JsonResponse
    {
        $gestion = Gestion::actual();

        if (! $gestion) {
            return response()->json([
                'message' => 'No hay una gestión activa.',
            ], 422);
        }

        try {
            $resultado = $this->asignacion->generarGrupos($gestion);

            $this->audit->log('generar_grupos', 'Gestion', $gestion->id, $resultado, $request);

            return response()->json([
                'message' => "Grupos generados correctamente para la gestión {$gestion->codigo}.",
                'data'    => $resultado,
            ], 201);
        } catch (\RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }
    }

    /**
     * Actualiza el aula y/o horario de un grupo específico.
     * El admin puede ajustar la asignación automática inicial.
     * Ruta: PUT /api/grupos/{grupo}/horario
     */
    public function actualizarHorario(Request $request, Grupo $grupo): JsonResponse
    {
        $horariosValidos = array_values(AsignacionGruposService::HORARIOS);

        $data = $request->validate([
            'aula'    => ['sometimes', 'required', 'string', 'max:20'],
            'horario' => ['sometimes', 'required', 'string', Rule::in($horariosValidos)],
        ], [
            'aula.required'    => 'El aula es obligatoria.',
            'horario.required' => 'El horario es obligatorio.',
            'horario.in'       => 'El horario seleccionado no es válido.',
        ]);

        $antes = $grupo->only(['aula', 'horario']);
        $grupo->update($data);

        $this->audit->log('editar_horario', 'Grupo', $grupo->id, [
            'antes'   => $antes,
            'despues' => $grupo->fresh()->only(['aula', 'horario']),
        ], $request);

        return response()->json([
            'message' => "Grupo {$grupo->nombre} actualizado correctamente.",
            'data'    => [
                'id'      => $grupo->id,
                'nombre'  => $grupo->nombre,
                'aula'    => $grupo->aula,
                'horario' => $grupo->horario,
            ],
        ]);
    }

    /**
     * Devuelve la lista de horarios disponibles para la UI.
     * Ruta: GET /api/grupos/horarios
     */
    public function horarios(): JsonResponse
    {
        $horarios = collect(AsignacionGruposService::HORARIOS)
            ->map(fn($label, $codigo) => [
                'codigo' => $codigo,
                'label'  => $label,
            ])
            ->values();

        return response()->json(['data' => $horarios]);
    }
}
