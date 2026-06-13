<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ConfiguracionSistema;
use App\Models\Examen;
use App\Models\Gestion;
use App\Models\Materia;
use App\Models\Nota;
use App\Models\Postulante;
use App\Services\AuditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Registro y cálculo de notas del CUP-FICCT (UC-12 y UC-13).
 *
 * UC-12: registro de calificaciones (individual o por lote por materia).
 * UC-13: cálculo automático del promedio ponderado y actualización del estado
 *        del postulante (aprobado/reprobado) al completar las 3 notas.
 *
 * Fórmula de promedio por materia (UC-13 — pregunta directa del examen):
 *   promedio_materia = (nota1 × peso1 + nota2 × peso2 + nota3 × peso3) / 100
 *   Donde peso1=30, peso2=30, peso3=40 (desde configuracion_sistema).
 *
 * Regla de aprobación:
 *   APROBADO: todas las materias tienen promedio >= nota_minima_aprobacion (60).
 *   REPROBADO: al menos una materia tiene promedio < 60.
 *
 * Rutas:
 *   GET  /api/notas/materia/{materia}     → notas de todos los postulantes por materia
 *   GET  /api/notas/postulante/{postulante} → notas de un postulante en todas las materias
 *   POST /api/notas/registrar             → registrar/actualizar una nota individual
 *   POST /api/notas/registrar-lote        → registrar varias notas de una materia en un request
 *   POST /api/notas/calcular/{postulante} → recalcular promedio y estado de un postulante
 *   POST /api/notas/calcular-todos        → recalcular promedio y estado de todos
 */
class NotaController extends Controller
{
    public function __construct(private AuditService $audit)
    {
    }

    /**
     * Devuelve las notas de todos los postulantes para una materia específica.
     * Vista principal de UC-12: tabla con postulantes × exámenes.
     * Ruta: GET /api/notas/materia/{materia}
     */
    public function porMateria(Materia $materia): JsonResponse
    {
        $gestion = Gestion::actual();
        if (! $gestion) {
            return response()->json(['message' => 'No hay una gestión activa.'], 422);
        }

        // Obtener los 3 exámenes de esta materia en la gestión activa.
        $examenes = Examen::where('gestion_id', $gestion->id)
            ->where('materia_id', $materia->id)
            ->orderBy('numero')
            ->get();

        if ($examenes->isEmpty()) {
            return response()->json([
                'message' => "No hay exámenes creados para {$materia->nombre} en la gestión {$gestion->codigo}. " .
                    "Genere los grupos primero para crear los exámenes automáticamente.",
                'data' => [],
            ]);
        }

        // Obtener todos los postulantes confirmados de la gestión.
        $postulantes = Postulante::where('gestion_id', $gestion->id)
            ->whereIn('estado', ['confirmado', 'aprobado', 'reprobado'])
            ->orderBy('apellidos')
            ->get(['id', 'nombres', 'apellidos', 'ci', 'estado']);

        // Obtener todas las notas de esta materia en un solo query.
        $examenIds = $examenes->pluck('id');
        $notas = Nota::whereIn('examen_id', $examenIds)
            ->whereIn('postulante_id', $postulantes->pluck('id'))
            ->get()
            ->groupBy('postulante_id');

        // Pesos de exámenes desde configuracion_sistema.
        $pesos = $this->obtenerPesos();

        // Construir la respuesta con una fila por postulante.
        $filas = $postulantes->map(function (Postulante $p) use ($examenes, $notas, $pesos) {
            $notasPostulante = $notas->get($p->id, collect());
            $notasPorExamen  = $notasPostulante->keyBy('examen_id');

            // Calcular promedio si tiene las 3 notas.
            $calificaciones = $examenes->map(fn($e) => $notasPorExamen->get($e->id)?->calificacion);
            $promedio = null;
            if ($calificaciones->filter(fn($c) => $c !== null)->count() === 3) {
                $promedio = $this->calcularPromedio($examenes, $notasPorExamen, $pesos);
            }

            return [
                'postulante_id' => $p->id,
                'ci'            => $p->ci,
                'nombres'       => $p->nombres,
                'apellidos'     => $p->apellidos,
                'estado'        => $p->estado,
                'notas'         => $examenes->map(fn($e) => [
                    'examen_id'    => $e->id,
                    'numero'       => $e->numero,
                    'nota_id'      => $notasPorExamen->get($e->id)?->id,
                    'calificacion' => $notasPorExamen->get($e->id)?->calificacion,
                ])->values(),
                'promedio'       => $promedio,
                'notas_completas' => $calificaciones->filter(fn($c) => $c !== null)->count() === 3,
            ];
        });

        return response()->json([
            'data'     => $filas,
            'materia'  => ['id' => $materia->id, 'nombre' => $materia->nombre, 'codigo' => $materia->codigo],
            'examenes' => $examenes->map(fn($e) => [
                'id' => $e->id, 'numero' => $e->numero, 'peso' => $pesos[$e->numero],
            ]),
            'gestion'  => ['codigo' => $gestion->codigo, 'estado' => $gestion->estado],
            'pesos'    => $pesos,
            'total'    => $filas->count(),
        ]);
    }

    /**
     * Devuelve todas las notas de un postulante en las 4 materias.
     * Vista secundaria UC-12: búsqueda por postulante.
     * Ruta: GET /api/notas/postulante/{postulante}
     */
    public function porPostulante(Postulante $postulante): JsonResponse
    {
        $gestion = Gestion::actual();
        if (! $gestion) {
            return response()->json(['message' => 'No hay una gestión activa.'], 422);
        }

        if ($postulante->gestion_id !== $gestion->id) {
            return response()->json([
                'message' => 'El postulante no pertenece a la gestión activa.',
            ], 422);
        }

        $pesos    = $this->obtenerPesos();
        $materias = Materia::orderBy('id')->get();

        $resultado = $materias->map(function (Materia $materia) use ($postulante, $gestion, $pesos) {
            $examenes = Examen::where('gestion_id', $gestion->id)
                ->where('materia_id', $materia->id)
                ->orderBy('numero')
                ->get();

            $notasPorExamen = Nota::where('postulante_id', $postulante->id)
                ->whereIn('examen_id', $examenes->pluck('id'))
                ->get()
                ->keyBy('examen_id');

            $promedio = null;
            if ($notasPorExamen->count() === 3) {
                $promedio = $this->calcularPromedio($examenes, $notasPorExamen, $pesos);
            }

            return [
                'materia'        => ['id' => $materia->id, 'nombre' => $materia->nombre, 'codigo' => $materia->codigo],
                'notas'          => $examenes->map(fn($e) => [
                    'examen_id'    => $e->id,
                    'numero'       => $e->numero,
                    'nota_id'      => $notasPorExamen->get($e->id)?->id,
                    'calificacion' => $notasPorExamen->get($e->id)?->calificacion,
                    'peso'         => $pesos[$e->numero],
                ])->values(),
                'promedio'        => $promedio,
                'notas_completas' => $notasPorExamen->count() === 3,
                'aprobada'        => $promedio !== null ? $promedio >= 60 : null,
            ];
        });

        return response()->json([
            'data'       => $resultado,
            'postulante' => [
                'id'        => $postulante->id,
                'ci'        => $postulante->ci,
                'nombres'   => $postulante->nombres,
                'apellidos' => $postulante->apellidos,
                'estado'    => $postulante->estado,
            ],
            'gestion' => ['codigo' => $gestion->codigo],
        ]);
    }

    /**
     * Registra o actualiza una nota individual.
     * Dispara automáticamente el cálculo de promedio si se completan las 3 notas.
     * Ruta: POST /api/notas/registrar
     */
    public function registrar(Request $request): JsonResponse
    {
        $data = $request->validate([
            'postulante_id' => ['required', 'integer', 'exists:postulantes,id'],
            'examen_id'     => ['required', 'integer', 'exists:examenes,id'],
            'calificacion'  => ['required', 'numeric', 'min:0', 'max:100'],
        ], [
            'postulante_id.required' => 'El postulante es obligatorio.',
            'examen_id.required'     => 'El examen es obligatorio.',
            'calificacion.required'  => 'La calificación es obligatoria.',
            'calificacion.min'       => 'La calificación mínima es 0.',
            'calificacion.max'       => 'La calificación máxima es 100.',
        ]);

        $gestion = Gestion::actual();
        $examen  = Examen::findOrFail($data['examen_id']);

        // Verificar que el examen pertenece a la gestión activa.
        if ($examen->gestion_id !== $gestion->id) {
            return response()->json([
                'message' => 'El examen no pertenece a la gestión activa.',
            ], 422);
        }

        DB::transaction(function () use ($data, $examen, $gestion, $request) {
            // updateOrCreate con idempotencia — si ya existe la nota, la actualiza.
            Nota::updateOrCreate(
                ['postulante_id' => $data['postulante_id'], 'examen_id' => $data['examen_id']],
                ['calificacion'  => round($data['calificacion'], 2), 'gestion_id' => $gestion->id]
            );

            $this->audit->log('registrar_nota', 'Nota', null, [
                'postulante_id' => $data['postulante_id'],
                'examen_id'     => $data['examen_id'],
                'calificacion'  => $data['calificacion'],
                'materia_id'    => $examen->materia_id,
            ], $request);

            // Calcular promedio automáticamente si se completaron las 3 notas de la materia.
            $this->recalcularSiCompleto($data['postulante_id'], $examen->materia_id, $gestion);
        });

        return response()->json(['message' => 'Nota registrada correctamente.']);
    }

    /**
     * Registra varias notas de una materia en un solo request (carga por lote).
     * Útil para registrar todas las notas de un examen de una materia de una vez.
     * Ruta: POST /api/notas/registrar-lote
     */
    public function registrarLote(Request $request): JsonResponse
    {
        $data = $request->validate([
            'examen_id'     => ['required', 'integer', 'exists:examenes,id'],
            'notas'         => ['required', 'array', 'min:1'],
            'notas.*.postulante_id' => ['required', 'integer', 'exists:postulantes,id'],
            'notas.*.calificacion'  => ['required', 'numeric', 'min:0', 'max:100'],
        ], [
            'examen_id.required'              => 'El examen es obligatorio.',
            'notas.required'                  => 'Debe enviar al menos una nota.',
            'notas.*.calificacion.min'        => 'La calificación mínima es 0.',
            'notas.*.calificacion.max'        => 'La calificación máxima es 100.',
        ]);

        $gestion = Gestion::actual();
        $examen  = Examen::findOrFail($data['examen_id']);

        if ($examen->gestion_id !== $gestion->id) {
            return response()->json(['message' => 'El examen no pertenece a la gestión activa.'], 422);
        }

        $ahora      = now()->toDateTimeString();
        $registradas = 0;

        DB::transaction(function () use ($data, $examen, $gestion, $ahora, &$registradas, $request) {
            foreach ($data['notas'] as $item) {
                Nota::updateOrCreate(
                    ['postulante_id' => $item['postulante_id'], 'examen_id' => $data['examen_id']],
                    ['calificacion'  => round($item['calificacion'], 2), 'gestion_id' => $gestion->id]
                );
                $registradas++;
            }

            // Recalcular promedios para todos los postulantes afectados.
            $postIds = collect($data['notas'])->pluck('postulante_id')->unique();
            foreach ($postIds as $postId) {
                $this->recalcularSiCompleto($postId, $examen->materia_id, $gestion);
            }

            $this->audit->log('registrar_notas_lote', 'Nota', null, [
                'examen_id'   => $data['examen_id'],
                'materia_id'  => $examen->materia_id,
                'cantidad'    => $registradas,
            ], $request);
        });

        return response()->json([
            'message' => "{$registradas} notas registradas correctamente.",
            'data'    => ['registradas' => $registradas],
        ]);
    }

    /**
     * Recalcula el promedio y actualiza el estado de un postulante específico.
     * UC-13: pregunta directa del examen — "¿dónde se calcula el promedio final?"
     * Ruta: POST /api/notas/calcular/{postulante}
     */
    public function calcularPostulante(Request $request, Postulante $postulante): JsonResponse
    {
        $gestion = Gestion::actual();

        $resultado = $this->ejecutarCalculo($postulante, $gestion);

        $this->audit->log('calcular_promedio', 'Postulante', $postulante->id, $resultado, $request);

        return response()->json([
            'message' => "Promedio calculado para {$postulante->nombres} {$postulante->apellidos}.",
            'data'    => $resultado,
        ]);
    }

    /**
     * Recalcula promedios y estados de TODOS los postulantes de la gestión activa.
     * Operación masiva — útil al finalizar el período de exámenes.
     * Ruta: POST /api/notas/calcular-todos
     */
    public function calcularTodos(Request $request): JsonResponse
    {
        $gestion = Gestion::actual();
        if (! $gestion) {
            return response()->json(['message' => 'No hay una gestión activa.'], 422);
        }

        $postulantes = Postulante::where('gestion_id', $gestion->id)
            ->whereIn('estado', ['confirmado', 'aprobado', 'reprobado'])
            ->get();

        $aprobados  = 0;
        $reprobados = 0;
        $pendientes = 0;

        DB::transaction(function () use ($postulantes, $gestion, &$aprobados, &$reprobados, &$pendientes) {
            foreach ($postulantes as $postulante) {
                $res = $this->ejecutarCalculo($postulante, $gestion);
                if ($res['estado'] === 'aprobado')  $aprobados++;
                if ($res['estado'] === 'reprobado') $reprobados++;
                if ($res['estado'] === 'pendiente') $pendientes++;
            }
        });

        $this->audit->log('calcular_todos_promedios', 'Gestion', $gestion->id, [
            'aprobados'  => $aprobados,
            'reprobados' => $reprobados,
            'pendientes' => $pendientes,
        ], $request);

        return response()->json([
            'message' => "Promedios calculados para {$postulantes->count()} postulantes.",
            'data'    => [
                'total'      => $postulantes->count(),
                'aprobados'  => $aprobados,
                'reprobados' => $reprobados,
                'pendientes' => $pendientes,
            ],
        ]);
    }

    // ── Helpers privados ──────────────────────────────────────────────────────

    /**
     * Ejecuta el cálculo de promedio ponderado para un postulante.
     *
     * ALGORITMO UC-13 (pregunta directa del examen):
     *   1. Para cada materia, calcular:
     *      promedio_materia = (n1×peso1 + n2×peso2 + n3×peso3) / 100
     *   2. Si TODAS las materias tienen promedio >= nota_minima (60) → APROBADO
     *   3. Si alguna materia tiene promedio < 60 → REPROBADO
     *   4. Si faltan notas en alguna materia → sin cambio de estado (PENDIENTE)
     */
    private function ejecutarCalculo(Postulante $postulante, ?Gestion $gestion): array
    {
        if (! $gestion) return ['estado' => 'error', 'mensaje' => 'Sin gestión activa'];

        $pesos    = $this->obtenerPesos();
        $materias = Materia::orderBy('id')->get();
        $notaMinima = (float) ConfiguracionSistema::obtener('nota_minima_aprobacion', 60);

        $promediosPorMateria = [];
        $todasCompletas      = true;

        foreach ($materias as $materia) {
            $examenes = Examen::where('gestion_id', $gestion->id)
                ->where('materia_id', $materia->id)
                ->orderBy('numero')
                ->get();

            if ($examenes->isEmpty()) {
                $todasCompletas = false;
                continue;
            }

            $notasPorExamen = Nota::where('postulante_id', $postulante->id)
                ->whereIn('examen_id', $examenes->pluck('id'))
                ->get()
                ->keyBy('examen_id');

            // Si faltan notas de esta materia, no se puede calcular aún.
            if ($notasPorExamen->count() < 3) {
                $todasCompletas = false;
                $promediosPorMateria[] = [
                    'materia'  => $materia->codigo,
                    'promedio' => null,
                    'completa' => false,
                ];
                continue;
            }

            // Fórmula 30/30/40 — núcleo del UC-13.
            $promedio = $this->calcularPromedio($examenes, $notasPorExamen, $pesos);
            $promediosPorMateria[] = [
                'materia'  => $materia->codigo,
                'promedio' => $promedio,
                'aprobada' => $promedio >= $notaMinima,
                'completa' => true,
            ];
        }

        // Actualizar estado del postulante solo si tiene todas las notas completas.
        $nuevoEstado = 'pendiente';
        if ($todasCompletas && ! empty($promediosPorMateria)) {
            $todasAprobadas = collect($promediosPorMateria)->every(fn($m) => $m['aprobada'] ?? false);
            $nuevoEstado    = $todasAprobadas ? 'aprobado' : 'reprobado';

            DB::table('postulantes')
                ->where('id', $postulante->id)
                ->update(['estado' => $nuevoEstado]);
        }

        return [
            'postulante_id'       => $postulante->id,
            'estado'              => $nuevoEstado,
            'promedios_materias'  => $promediosPorMateria,
            'todas_completas'     => $todasCompletas,
        ];
    }

    /**
     * Recalcula el promedio de una materia específica para un postulante.
     * Se llama automáticamente al registrar una nota si las 3 ya están completas.
     */
    private function recalcularSiCompleto(int $postId, int $materiaId, Gestion $gestion): void
    {
        $examenes = Examen::where('gestion_id', $gestion->id)
            ->where('materia_id', $materiaId)
            ->orderBy('numero')
            ->get();

        $notasPorExamen = Nota::where('postulante_id', $postId)
            ->whereIn('examen_id', $examenes->pluck('id'))
            ->get()
            ->keyBy('examen_id');

        // Solo recalcular si están las 3 notas de esta materia.
        if ($notasPorExamen->count() < 3) return;

        // Verificar si las 4 materias están completas para actualizar el estado.
        $postulante = Postulante::find($postId);
        if ($postulante) {
            $this->ejecutarCalculo($postulante, $gestion);
        }
    }

    /**
     * Calcula el promedio ponderado de una materia.
     * Fórmula: (n1×p1 + n2×p2 + n3×p3) / 100
     */
    private function calcularPromedio($examenes, $notasPorExamen, array $pesos): float
    {
        $suma = 0;
        foreach ($examenes as $examen) {
            $calificacion = (float) ($notasPorExamen->get($examen->id)?->calificacion ?? 0);
            $peso         = $pesos[$examen->numero] ?? 33.33;
            $suma        += $calificacion * $peso;
        }
        return round($suma / 100, 2);
    }

    /**
     * Lee los pesos de exámenes desde configuracion_sistema.
     * Default: 30/30/40 si no están configurados.
     */
    private function obtenerPesos(): array
    {
        return [
            1 => (float) ConfiguracionSistema::obtener('peso_examen_1', 30),
            2 => (float) ConfiguracionSistema::obtener('peso_examen_2', 30),
            3 => (float) ConfiguracionSistema::obtener('peso_examen_3', 40),
        ];
    }
}
