<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ConfiguracionSistema;
use App\Models\Docente;
use App\Models\Examen;
use App\Models\Gestion;
use App\Models\Grupo;
use App\Models\Nota;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Portal del docente (UC-17).
 *
 * El docente autenticado puede ver:
 *   - Sus grupos asignados en la gestión activa (materias, aulas, horarios)
 *   - Los postulantes inscritos en cada grupo
 *   - Las notas de los postulantes en su materia
 *
 * Todo es solo lectura — el registro de notas lo hace el coordinador (UC-12).
 *
 * Rutas:
 *   GET /api/docente/mis-grupos              → grupos asignados al docente
 *   GET /api/docente/mis-grupos/{grupo}      → detalle de un grupo con postulantes y notas
 */
class MisGruposController extends Controller
{
    /**
     * Devuelve los grupos asignados al docente autenticado en la gestión activa.
     * Incluye materia, aula, horario y conteo de inscritos.
     * Ruta: GET /api/docente/mis-grupos
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

        // Obtener el perfil de docente del usuario autenticado.
        $docente = Docente::where('user_id', $request->user()->id)
            ->whereRaw('"activo" = TRUE')
            ->first();

        if (! $docente) {
            return response()->json([
                'message' => 'No se encontró un perfil de docente para este usuario.',
                'data'    => [],
            ], 404);
        }

        // Obtener grupos asignados al docente en la gestión activa.
        $grupos = Grupo::where('gestion_id', $gestion->id)
            ->where('docente_id', $docente->id)
            ->with(['materia'])
            ->withCount('inscripciones')
            ->orderBy('materia_id')
            ->orderBy('nombre')
            ->get()
            ->map(fn(Grupo $g) => [
                'id'        => $g->id,
                'nombre'    => $g->nombre,
                'aula'      => $g->aula ?? 'Por asignar',
                'horario'   => $g->horario ?? 'Por asignar',
                'capacidad' => $g->capacidad,
                'inscritos' => $g->inscripciones_count,
                'materia'   => [
                    'id'     => $g->materia->id,
                    'nombre' => $g->materia->nombre,
                    'codigo' => $g->materia->codigo,
                ],
            ]);

        return response()->json([
            'data'    => $grupos,
            'docente' => [
                'id'        => $docente->id,
                'nombres'   => $docente->nombres,
                'apellidos' => $docente->apellidos,
                'titulo'    => $docente->titulo,
            ],
            'gestion' => [
                'codigo' => $gestion->codigo,
                'estado' => $gestion->estado,
            ],
            'total_grupos' => $grupos->count(),
        ]);
    }

    /**
     * Devuelve el detalle de un grupo específico con sus postulantes y notas.
     * Verifica que el grupo pertenece al docente autenticado.
     * Ruta: GET /api/docente/mis-grupos/{grupo}
     */
    public function show(Request $request, Grupo $grupo): JsonResponse
    {
        $gestion = Gestion::actual();

        // Verificar que el grupo pertenece al docente autenticado.
        $docente = Docente::where('user_id', $request->user()->id)
            ->whereRaw('"activo" = TRUE')
            ->first();

        if (! $docente || $grupo->docente_id !== $docente->id) {
            return response()->json([
                'message' => 'No tiene acceso a este grupo.',
            ], 403);
        }

        $grupo->load(['materia']);

        // Obtener los 3 exámenes de esta materia en la gestión activa.
        $examenes = Examen::where('gestion_id', $gestion->id)
            ->where('materia_id', $grupo->materia_id)
            ->orderBy('numero')
            ->get();

        // Pesos para mostrar en la UI.
        $pesos = [
            1 => (float) ConfiguracionSistema::obtener('peso_examen_1', 30),
            2 => (float) ConfiguracionSistema::obtener('peso_examen_2', 30),
            3 => (float) ConfiguracionSistema::obtener('peso_examen_3', 40),
        ];

        // Obtener postulantes inscritos en este grupo con sus notas.
        $inscripciones = $grupo->inscripciones()
            ->with('postulante')
            ->get();

        $examenIds = $examenes->pluck('id');

        // Obtener todas las notas de los postulantes en esta materia de una vez.
        $postulanteIds = $inscripciones->pluck('postulante.id');
        $todasLasNotas = Nota::whereIn('postulante_id', $postulanteIds)
            ->whereIn('examen_id', $examenIds)
            ->get()
            ->groupBy('postulante_id');

        $postulantes = $inscripciones->map(function ($inscripcion) use ($examenes, $todasLasNotas, $pesos) {
            $postulante     = $inscripcion->postulante;
            $notasPostulante = $todasLasNotas->get($postulante->id, collect());
            $notasPorExamen  = $notasPostulante->keyBy('examen_id');

            // Calcular promedio si tiene las 3 notas.
            $promedio = null;
            if ($notasPorExamen->count() === 3) {
                $suma = 0;
                foreach ($examenes as $examen) {
                    $cal   = (float) ($notasPorExamen->get($examen->id)?->calificacion ?? 0);
                    $suma += $cal * $pesos[$examen->numero];
                }
                $promedio = round($suma / 100, 2);
            }

            return [
                'postulante_id'   => $postulante->id,
                'ci'              => $postulante->ci,
                'nombres'         => $postulante->nombres,
                'apellidos'       => $postulante->apellidos,
                'estado'          => $postulante->estado,
                'notas'           => $examenes->map(fn($e) => [
                    'examen_id'    => $e->id,
                    'numero'       => $e->numero,
                    'calificacion' => $notasPorExamen->get($e->id)?->calificacion,
                    'peso'         => $pesos[$e->numero],
                ])->values(),
                'promedio'        => $promedio,
                'notas_completas' => $notasPorExamen->count() === 3,
            ];
        })->sortBy('apellidos')->values();

        return response()->json([
            'data' => $postulantes,
            'grupo' => [
                'id'        => $grupo->id,
                'nombre'    => $grupo->nombre,
                'aula'      => $grupo->aula ?? 'Por asignar',
                'horario'   => $grupo->horario ?? 'Por asignar',
                'capacidad' => $grupo->capacidad,
                'inscritos' => $postulantes->count(),
            ],
            'materia' => [
                'id'     => $grupo->materia->id,
                'nombre' => $grupo->materia->nombre,
                'codigo' => $grupo->materia->codigo,
            ],
            'examenes' => $examenes->map(fn($e) => [
                'id'     => $e->id,
                'numero' => $e->numero,
                'peso'   => $pesos[$e->numero],
            ]),
            'pesos'   => $pesos,
            'docente' => [
                'nombres'   => $docente->nombres,
                'apellidos' => $docente->apellidos,
                'titulo'    => $docente->titulo,
            ],
            'gestion' => ['codigo' => $gestion->codigo],
        ]);
    }
}
