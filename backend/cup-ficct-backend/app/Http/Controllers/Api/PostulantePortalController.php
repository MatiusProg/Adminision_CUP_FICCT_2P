<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Gestion;
use App\Models\Postulante;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Portal del postulante (UC-23).
 *
 * Expone dos endpoints de solo lectura:
 *   GET /api/postulante/mis-materias  → grupos, aula, horario y docente
 *   GET /api/postulante/mis-notas     → calificaciones y promedio por materia
 *
 * Lógica de acceso (Opción B acordada):
 *   - El login nunca se bloquea por gestión.
 *   - El portal busca si el user autenticado tiene un postulante en la gestión activa.
 *   - Si no tiene postulante activo → 404 con mensaje claro.
 *   - Si la fase de la gestión no es suficiente → 403 con mensaje de fase.
 */
class PostulantePortalController extends Controller
{
    /**
     * Fases mínimas requeridas para cada endpoint.
     * El orden del ciclo de vida de una gestión es:
     * inscripciones_abiertas → cup_iniciado → grupos_generados
     * → docentes_asignados → en_curso → finalizada
     */
    private const FASE_MATERIAS = ['grupos_generados', 'docentes_asignados', 'en_curso', 'finalizada'];
    private const FASE_NOTAS    = ['en_curso', 'finalizada'];

    /**
     * Devuelve el postulante de la gestión activa para el user autenticado,
     * o null si no existe. Centraliza la búsqueda para ambos endpoints.
     */
    private function resolverPostulante(Request $request): ?Postulante
    {
        // Obtener la gestión activa del sistema.
        $gestion = Gestion::actual();
        if (! $gestion) {
            return null;
        }

        // Buscar el postulante del user en esa gestión específica.
        // Un mismo user_id puede tener postulantes en múltiples gestiones (repitentes).
        return Postulante::where('user_id', $request->user()->id)
            ->where('gestion_id', $gestion->id)
            ->first();
    }

    /**
     * GET /api/postulante/mis-materias
     *
     * Muestra los 4 grupos del postulante (uno por materia) con:
     * nombre del grupo, materia, aula, horario, docente.
     * Requiere que la gestión esté en fase >= grupos_generados.
     */
    public function misMaterias(Request $request): JsonResponse
    {
        // Verificar gestión activa.
        $gestion = Gestion::actual();
        if (! $gestion) {
            return response()->json([
                'message' => 'No hay una gestión activa en este momento.',
            ], 404);
        }

        // Verificar que el postulante tiene inscripción en la gestión activa.
        $postulante = $this->resolverPostulante($request);
        if (! $postulante) {
            return response()->json([
                'message' => "No tiene una inscripción en la gestión activa ({$gestion->codigo}). Si realizó su pago, contacte a la coordinación.",
                'gestion_activa' => $gestion->codigo,
            ], 404);
        }

        // Verificar que la gestión está en una fase que permita ver materias.
        if (! in_array($gestion->estado, self::FASE_MATERIAS)) {
            return response()->json([
                'message' => 'Los grupos aún no han sido generados para esta gestión.',
                'fase_actual' => $gestion->estado,
            ], 403);
        }

        // Cargar las 4 inscripciones del postulante con sus relaciones.
        // inscripciones → grupo → materia + docente
        $inscripciones = $postulante->inscripciones()
            ->with([
                'grupo.materia',
                'grupo.docente',
            ])
            ->whereHas('grupo', function ($q) use ($gestion) {
                // Solo grupos de la gestión activa (doble seguridad).
                $q->where('gestion_id', $gestion->id);
            })
            ->get();

        // Formatear la respuesta para el frontend.
        $materias = $inscripciones->map(function ($inscripcion) {
            $grupo   = $inscripcion->grupo;
            $materia = $grupo->materia;
            $docente = $grupo->docente;

            return [
                'inscripcion_id' => $inscripcion->id,
                'materia' => [
                    'id'     => $materia->id,
                    'nombre' => $materia->nombre,
                    'codigo' => $materia->codigo,
                ],
                'grupo' => [
                    'id'       => $grupo->id,
                    'nombre'   => $grupo->nombre,
                    'aula'     => $grupo->aula     ?? 'Por asignar',
                    'horario'  => $grupo->horario  ?? 'Por asignar',
                ],
                'docente' => $docente ? [
                    'nombres'   => $docente->nombres,
                    'apellidos' => $docente->apellidos,
                    'titulo'    => $docente->titulo ?? null,
                ] : null,
            ];
        })->sortBy('materia.nombre')->values();

        return response()->json([
            'data' => $materias,
            'postulante' => [
                'nombres'   => $postulante->nombres,
                'apellidos' => $postulante->apellidos,
                'ci'        => $postulante->ci,
                'estado'    => $postulante->estado,
            ],
            'gestion' => [
                'codigo' => $gestion->codigo,
                'estado' => $gestion->estado,
            ],
        ]);
    }

    /**
     * GET /api/postulante/mis-notas
     *
     * Muestra las 3 notas por cada materia con el promedio ponderado calculado.
     * Fórmula: promedio_materia = (n1×30 + n2×30 + n3×40) / 100
     * Requiere que la gestión esté en fase >= en_curso.
     */
    public function misNotas(Request $request): JsonResponse
    {
        // Verificar gestión activa.
        $gestion = Gestion::actual();
        if (! $gestion) {
            return response()->json([
                'message' => 'No hay una gestión activa en este momento.',
            ], 404);
        }

        // Verificar inscripción activa.
        $postulante = $this->resolverPostulante($request);
        if (! $postulante) {
            return response()->json([
                'message' => "No tiene una inscripción en la gestión activa ({$gestion->codigo}). Si realizó su pago, contacte a la coordinación.",
                'gestion_activa' => $gestion->codigo,
            ], 404);
        }

        // Verificar fase mínima.
        if (! in_array($gestion->estado, self::FASE_NOTAS)) {
            return response()->json([
                'message' => 'Las notas aún no están disponibles para esta gestión.',
                'fase_actual' => $gestion->estado,
            ], 403);
        }

        // Cargar las notas del postulante en esta gestión.
        // notas → examen → materia
        $notas = $postulante->notas()
            ->where('gestion_id', $gestion->id)
            ->with(['examen.materia'])
            ->get();

        // Pesos de exámenes desde configuracion_sistema (30/30/40).
        // Se leen del modelo helper para no hardcodear valores.
        $pesos = [
            1 => (float) \App\Models\ConfiguracionSistema::obtener('peso_examen_1', 30),
            2 => (float) \App\Models\ConfiguracionSistema::obtener('peso_examen_2', 30),
            3 => (float) \App\Models\ConfiguracionSistema::obtener('peso_examen_3', 40),
        ];

        // Agrupar notas por materia y calcular promedio ponderado.
        $porMateria = $notas->groupBy(fn($nota) => $nota->examen->materia->id);

        $resultado = $porMateria->map(function ($notasMateria) use ($pesos) {
            $materia = $notasMateria->first()->examen->materia;

            // Indexar por número de examen para acceso directo.
            $indexadas = $notasMateria->keyBy(fn($n) => $n->examen->numero);

            // Calcular promedio ponderado solo si están las 3 notas.
            $promedio = null;
            if ($indexadas->count() === 3) {
                $promedio = round(
                    ($indexadas[1]->calificacion * $pesos[1] +
                     $indexadas[2]->calificacion * $pesos[2] +
                     $indexadas[3]->calificacion * $pesos[3]) / 100,
                    2
                );
            }

            return [
                'materia' => [
                    'id'     => $materia->id,
                    'nombre' => $materia->nombre,
                    'codigo' => $materia->codigo,
                ],
                'notas' => [
                    'examen_1' => $indexadas[1]->calificacion ?? null,
                    'examen_2' => $indexadas[2]->calificacion ?? null,
                    'examen_3' => $indexadas[3]->calificacion ?? null,
                ],
                'promedio'      => $promedio,
                'total_notas'   => $indexadas->count(),
                'notas_completas' => $indexadas->count() === 3,
            ];
        })->sortBy('materia.nombre')->values();

        // Calcular promedio general si todas las materias tienen notas completas.
        $todasCompletas = $resultado->every(fn($m) => $m['notas_completas']);
        $promedioGeneral = null;
        if ($todasCompletas && $resultado->isNotEmpty()) {
            $promedioGeneral = round(
                $resultado->avg(fn($m) => $m['promedio']),
                2
            );
        }

        return response()->json([
            'data' => $resultado,
            'resumen' => [
                'promedio_general' => $promedioGeneral,
                'materias_completas' => $resultado->where('notas_completas', true)->count(),
                'total_materias'     => $resultado->count(),
                'estado_postulante'  => $postulante->estado,
            ],
            'postulante' => [
                'nombres'   => $postulante->nombres,
                'apellidos' => $postulante->apellidos,
                'ci'        => $postulante->ci,
                'estado'    => $postulante->estado,
            ],
            'gestion' => [
                'codigo' => $gestion->codigo,
                'estado' => $gestion->estado,
            ],
        ]);
    }
}
