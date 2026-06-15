<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Docente;
use App\Models\Gestion;
use App\Models\Grupo;
use App\Services\AsignacionGruposService;
use App\Services\AuditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * Gestión de grupos del CUP-FICCT (UC-14 y UC-15).
 *
 * UC-14: generación automática de grupos con el algoritmo CEIL.
 * UC-15: asignación manual de docentes a grupos con validaciones:
 *   - Requisitos de formación por materia (título/grado académico)
 *   - Tope máximo de grupos por docente (configurable, default 4)
 *   - Sin conflicto de horario (un docente no puede tener 2 grupos a la misma hora)
 *
 * Rutas:
 *   GET    /api/grupos                                → listar grupos de la gestión activa
 *   GET    /api/grupos/horarios                       → lista de horarios disponibles
 *   POST   /api/grupos/generar                        → ejecutar algoritmo CEIL (UC-14)
 *   PUT    /api/grupos/{grupo}/horario                → actualizar aula y/o horario
 *   GET    /api/grupos/{grupo}/docentes-disponibles   → docentes que pueden tomar el grupo
 *   PUT    /api/grupos/{grupo}/asignar-docente        → asignar docente al grupo (UC-15)
 *   DELETE /api/grupos/{grupo}/docente                → desasignar docente del grupo
 */
class GrupoController extends Controller
{
    /**
     * Palabras clave en el título que habilitan al docente para cada materia.
     *
     * Pregunta directa del examen P3: "¿Cómo verifica el sistema que el docente
     * es profesional en el área para impartir determinada materia?"
     *
     * ING  → título debe contener palabras relacionadas a idiomas/inglés
     * COMP → título debe contener palabras de ingeniería en computación/sistemas
     * MAT  → cualquier grado académico (Licenciatura o superior)
     * FIS  → cualquier grado académico (Licenciatura o superior)
     */
    private const REQUISITOS_POR_MATERIA = [
        'ING'  => ['tipo' => 'titulo', 'palabras' => ['ingles', 'english', 'cambridge', 'toefl', 'idiomas']],
        'COMP' => ['tipo' => 'titulo', 'palabras' => ['sistemas', 'informatico', 'telecomunicaciones', 'computacion', 'software']],
        'MAT'  => ['tipo' => 'grado',  'palabras' => ['Licenciatura', 'Maestría', 'Doctorado']],
        'FIS'  => ['tipo' => 'grado',  'palabras' => ['Licenciatura', 'Maestría', 'Doctorado']],
    ];

    public function __construct(
        private AsignacionGruposService $asignacion,
        private AuditService $audit
    ) {
    }

    /**
     * Lista todos los grupos de la gestión activa agrupados por materia.
     * Incluye docente asignado y conteo de inscritos.
     * Ruta: GET /api/grupos
     */
    public function index(): JsonResponse
    {
        $gestion = Gestion::actual();

        if (! $gestion) {
            return response()->json(['message' => 'No hay una gestión activa.', 'data' => []]);
        }

        $grupos = Grupo::where('gestion_id', $gestion->id)
            ->with(['materia', 'docente'])
            ->withCount('inscripciones')
            ->orderBy('materia_id')
            ->orderBy('nombre')
            ->get()
            ->map(fn(Grupo $g) => [
                'id'        => $g->id,
                'nombre'    => $g->nombre,
                'aula'      => $g->aula,
                'horario'   => $g->horario,
                'capacidad' => $g->capacidad,
                'inscritos' => $g->inscripciones_count,
                'materia'   => ['id' => $g->materia->id, 'nombre' => $g->materia->nombre, 'codigo' => $g->materia->codigo],
                'docente'   => $g->docente ? [
                    'id' => $g->docente->id, 'nombres' => $g->docente->nombres,
                    'apellidos' => $g->docente->apellidos, 'titulo' => $g->docente->titulo,
                ] : null,
            ]);

        $porMateria = $grupos->groupBy('materia.codigo')->map(function ($gs) {
            $p = $gs->first();
            return ['materia_id' => $p['materia']['id'], 'materia_nombre' => $p['materia']['nombre'],
                    'materia_codigo' => $p['materia']['codigo'], 'grupos' => $gs->values()];
        })->values();

        return response()->json([
            'data'         => $porMateria,
            'gestion'      => ['codigo' => $gestion->codigo, 'estado' => $gestion->estado],
            'total_grupos' => $grupos->count(),
        ]);
    }

    
    /**
     * Ejecuta el algoritmo CEIL para generar grupos automáticamente (UC-14).
     * Ruta: POST /api/grupos/generar
     */
    public function generar(Request $request): JsonResponse
    {
        $gestion = Gestion::actual();
        if (! $gestion) {
            return response()->json(['message' => 'No hay una gestión activa.'], 422);
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
     * Actualiza el aula y/o horario de un grupo (UC-14).
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
            'antes' => $antes, 'despues' => $grupo->fresh()->only(['aula', 'horario']),
        ], $request);

        return response()->json([
            'message' => "Grupo {$grupo->nombre} actualizado correctamente.",
            'data'    => $grupo->fresh()->only(['id', 'nombre', 'aula', 'horario']),
        ]);
    }

    /**
     * Lista docentes disponibles para un grupo aplicando las 3 validaciones de UC-15:
     *   1. Requisito de formación por materia
     *   2. Sin superar tope de grupos por docente
     *   3. Sin conflicto de horario
     * Ruta: GET /api/grupos/{grupo}/docentes-disponibles
     */
    public function docentesDisponibles(Grupo $grupo): JsonResponse
    {
        $grupo->load('materia');
        $gestion = Gestion::actual();

        if (! $gestion) {
            return response()->json(['message' => 'No hay una gestión activa.'], 422);
        }

        $maxGrupos = (int) \App\Models\ConfiguracionSistema::obtener('max_grupos_por_docente', 4);
        $docentes  = Docente::whereRaw('"activo" = TRUE')->get();

        $disponibles = $docentes->filter(function (Docente $docente) use ($grupo, $gestion, $maxGrupos) {
            // Validación 1: requisito de formación.
            if (! $this->cumpleRequisito($docente, $grupo->materia->codigo)) {
                return false;
            }

            // Validación 2: tope de grupos.
            $gruposActuales = Grupo::where('gestion_id', $gestion->id)
                ->where('docente_id', $docente->id)
                ->where('id', '!=', $grupo->id)
                ->count();
            if ($gruposActuales >= $maxGrupos) {
                return false;
            }

            // Validación 3: conflicto de horario.
            if ($grupo->horario) {
                $conflicto = Grupo::where('gestion_id', $gestion->id)
                    ->where('docente_id', $docente->id)
                    ->where('horario', $grupo->horario)
                    ->where('id', '!=', $grupo->id)
                    ->exists();
                if ($conflicto) {
                    return false;
                }
            }

            return true;
        })->map(function (Docente $docente) use ($gestion, $maxGrupos) {
            $asignados = Grupo::where('gestion_id', $gestion->id)
                ->where('docente_id', $docente->id)->count();
            return [
                'id'                 => $docente->id,
                'nombres'            => $docente->nombres,
                'apellidos'          => $docente->apellidos,
                'titulo'             => $docente->titulo,
                'grado_academico'    => $docente->grado_academico,
                'grupos_asignados'   => $asignados,
                'grupos_disponibles' => $maxGrupos - $asignados,
            ];
        })->values();

        return response()->json([
            'data'      => $disponibles,
            'grupo'     => ['id' => $grupo->id, 'nombre' => $grupo->nombre, 'horario' => $grupo->horario],
            'materia'   => ['codigo' => $grupo->materia->codigo, 'nombre' => $grupo->materia->nombre],
            'requisito' => $this->descripcionRequisito($grupo->materia->codigo),
        ]);
    }

    /**
     * Asigna un docente a un grupo con re-validación completa en servidor (UC-15).
     * Ruta: PUT /api/grupos/{grupo}/asignar-docente
     */
    public function asignarDocente(Request $request, Grupo $grupo): JsonResponse
    {
        $data = $request->validate([
            'docente_id' => ['required', 'integer', 'exists:docentes,id'],
        ], [
            'docente_id.required' => 'El docente es obligatorio.',
            'docente_id.exists'   => 'El docente seleccionado no existe.',
        ]);

        $grupo->load('materia');
        $gestion = Gestion::actual();
        $docente = Docente::findOrFail($data['docente_id']);

        // Re-validar en servidor — nunca confiar solo en el frontend.

        // 1. Requisito de formación.
        if (! $this->cumpleRequisito($docente, $grupo->materia->codigo)) {
            return response()->json([
                'message' => "El docente {$docente->nombres} {$docente->apellidos} no cumple los requisitos " .
                    "de formación para impartir {$grupo->materia->nombre}. " .
                    $this->descripcionRequisito($grupo->materia->codigo),
            ], 422);
        }

        // 2. Tope de grupos.
        $maxGrupos      = (int) \App\Models\ConfiguracionSistema::obtener('max_grupos_por_docente', 4);
        $gruposActuales = Grupo::where('gestion_id', $gestion->id)
            ->where('docente_id', $docente->id)
            ->where('id', '!=', $grupo->id)
            ->count();

        if ($gruposActuales >= $maxGrupos) {
            return response()->json([
                'message' => "El docente {$docente->nombres} {$docente->apellidos} ya tiene el máximo " .
                    "de {$maxGrupos} grupos asignados. Seleccione otro docente.",
            ], 422);
        }

        // 3. Conflicto de horario.
        if ($grupo->horario) {
            $conflicto = Grupo::where('gestion_id', $gestion->id)
                ->where('docente_id', $docente->id)
                ->where('horario', $grupo->horario)
                ->where('id', '!=', $grupo->id)
                ->first();

            if ($conflicto) {
                return response()->json([
                    'message' => "El docente {$docente->nombres} {$docente->apellidos} ya tiene el grupo " .
                        "{$conflicto->nombre} en el horario {$grupo->horario}. " .
                        "Seleccione otro docente u otro horario.",
                ], 422);
            }
        }

        $docenteAnterior = $grupo->docente_id;
        $grupo->update(['docente_id' => $docente->id]);

        $this->audit->log('asignar_docente', 'Grupo', $grupo->id, [
            'grupo'            => $grupo->nombre,
            'docente_anterior' => $docenteAnterior,
            'docente_nuevo'    => $docente->id,
            'materia'          => $grupo->materia->codigo,
        ], $request);

        return response()->json([
            'message' => "Docente {$docente->nombres} {$docente->apellidos} asignado al grupo {$grupo->nombre}.",
            'data'    => [
                'id'      => $grupo->id,
                'nombre'  => $grupo->nombre,
                'docente' => [
                    'id'        => $docente->id,
                    'nombres'   => $docente->nombres,
                    'apellidos' => $docente->apellidos,
                    'titulo'    => $docente->titulo,
                ],
            ],
        ]);
    }

    /**
     * Desasigna el docente de un grupo.
     * Ruta: DELETE /api/grupos/{grupo}/docente
     */
    public function desasignarDocente(Request $request, Grupo $grupo): JsonResponse
    {
        if (! $grupo->docente_id) {
            return response()->json(['message' => 'El grupo no tiene docente asignado.'], 422);
        }

        $docenteAnterior = $grupo->docente_id;
        $grupo->update(['docente_id' => null]);

        $this->audit->log('desasignar_docente', 'Grupo', $grupo->id, [
            'grupo' => $grupo->nombre, 'docente_anterior' => $docenteAnterior,
        ], $request);

        return response()->json(['message' => "Docente desasignado del grupo {$grupo->nombre}."]);
    }

    /**
     * Lista de horarios disponibles para la UI.
     * Ruta: GET /api/grupos/horarios
     */
    public function horarios(): JsonResponse
    {
        $horarios = collect(AsignacionGruposService::HORARIOS)
            ->map(fn($label, $codigo) => ['codigo' => $codigo, 'label' => $label])
            ->values();
        return response()->json(['data' => $horarios]);
    }

    /**
     * Verifica si un docente cumple el requisito de formación para una materia.
     * Normaliza acentos para comparación robusta.
     */
    private function cumpleRequisito(Docente $docente, string $codigoMateria): bool
    {
        $requisito = self::REQUISITOS_POR_MATERIA[$codigoMateria] ?? null;
        if (! $requisito) return true;

        if ($requisito['tipo'] === 'titulo') {
            $norm = strtolower(strtr($docente->titulo ?? '',
                ['á'=>'a','é'=>'e','í'=>'i','ó'=>'o','ú'=>'u','ñ'=>'n',
                 'Á'=>'a','É'=>'e','Í'=>'i','Ó'=>'o','Ú'=>'u','Ñ'=>'n']));
            foreach ($requisito['palabras'] as $palabra) {
                if (str_contains($norm, strtolower($palabra))) return true;
            }
            return false;
        }

        if ($requisito['tipo'] === 'grado') {
            return in_array($docente->grado_academico, $requisito['palabras'], true);
        }

        return false;
    }

    /**
     * Descripción legible del requisito por materia (incluida en errores de asignación).
     */
    private function descripcionRequisito(string $codigoMateria): string
    {
        return match ($codigoMateria) {
            'ING'  => 'Para Inglés se requiere título con especialidad en idiomas (Lic. en Inglés, Cambridge, TOEFL, etc.).',
            'COMP' => 'Para Computación se requiere título de Ing. en Sistemas, Ing. Informático o Ing. en Telecomunicaciones.',
            'MAT'  => 'Para Matemáticas se requiere grado académico de Licenciatura o superior.',
            'FIS'  => 'Para Física se requiere grado académico de Licenciatura o superior.',
            default => 'Verifique los requisitos de formación para esta materia.',
        };
    }
}