<?php

namespace App\Services;

use App\Models\Carrera;
use App\Models\CupoAsignado;
use App\Models\Gestion;
use App\Models\Postulante;
use Illuminate\Support\Facades\DB;

/**
 * Servicio de asignación de cupos por carrera (UC-16).
 *
 * ALGORITMO DE RANKING (pregunta directa del examen P4):
 *   1. Tomar todos los postulantes con estado 'aprobado' de la gestión activa.
 *   2. Ordenar por promedio_general DESCENDENTE (el mejor promedio primero).
 *   3. Para cada postulante en orden de ranking:
 *      a. Si hay cupo disponible en su 1ra opción → asignar (opcion_asignada = 'primera')
 *      b. Si no, si hay cupo en su 2da opción → asignar (opcion_asignada = 'segunda')
 *      c. Si no hay cupo en ninguna → no_admitido (carrera_id = null)
 *   4. Actualizar postulantes.estado:
 *      - 'admitido'    si obtuvo cupo en alguna opción
 *      - 'no_admitido' si no hubo cupo disponible
 *
 * El promedio_general de cada postulante se calcula como el promedio
 * simple de los promedios ponderados de sus 4 materias.
 *
 * Ejemplo con 120 aprobados y 100 cupos en una carrera (pregunta del examen):
 *   - Los primeros 100 por ranking obtienen cupo en 1ra o 2da opción.
 *   - Los 20 restantes quedan no_admitidos si tampoco hay cupo en su 2da opción.
 */
class AsignacionCuposService
{
    /**
     * Ejecuta el algoritmo de asignación de cupos para la gestión activa.
     * Si ya existe un resultado previo, lo elimina y recalcula.
     *
     * @throws \RuntimeException Si no se cumplen las precondiciones.
     * @return array Resumen del resultado: admitidos, no_admitidos, por carrera.
     */
    public function asignarCupos(Gestion $gestion): array
    {
        // Verificar que la gestión está en fase correcta para asignar cupos.
        $fasesPermitidas = ['grupos_generados', 'docentes_asignados', 'en_curso', 'finalizada'];
        if (! in_array($gestion->estado, $fasesPermitidas)) {
            throw new \RuntimeException(
                "La gestión debe tener los promedios calculados para asignar cupos. " .
                "Fase actual: {$gestion->estado}. Calcule los promedios primero (UC-13)."
            );
        }

        // Obtener postulantes aprobados con sus promedios calculados.
        $aprobados = $this->obtenerAprobadosConPromedio($gestion);

        if ($aprobados->isEmpty()) {
            throw new \RuntimeException(
                "No hay postulantes con estado 'aprobado' en la gestión {$gestion->codigo}. " .
                "Calcule los promedios primero (UC-13)."
            );
        }

        // Obtener cupos disponibles por carrera (mapa carrera_id => cupo_maximo).
        $cuposDisponibles = Carrera::all()->keyBy('id')->map(fn($c) => $c->cupo_maximo);
        // Contador de cupos usados por carrera.
        $cuposUsados = $cuposDisponibles->mapWithKeys(fn($_, $id) => [$id => 0]);

        $resultado = DB::transaction(function () use ($gestion, $aprobados, $cuposDisponibles, &$cuposUsados) {
            // Limpiar resultados previos de esta gestión (re-ejecución idempotente).
            CupoAsignado::where('gestion_id', $gestion->id)->delete();

            $admitidos   = 0;
            $noAdmitidos = 0;
            $porCarrera  = [];
            $inserts     = [];

            // ── ALGORITMO PRINCIPAL ──────────────────────────────────────────
            // Iterar en orden de ranking (promedio_general DESC).
            foreach ($aprobados as $posicion => $postulante) {
                $posicionRanking = $posicion + 1;
                $carreraAsignada = null;
                $opcionAsignada  = 'no_admitido';

                // Intentar 1ra opción.
                $carrera1Id = $postulante->carrera_1ra_opcion_id;
                if ($carrera1Id && $this->hayCupo($cuposUsados[$carrera1Id] ?? 0, $cuposDisponibles[$carrera1Id] ?? 0)) {
                    $carreraAsignada       = $carrera1Id;
                    $opcionAsignada        = 'primera';
                    $cuposUsados[$carrera1Id]++;
                }
                // Si no hay en 1ra, intentar 2da opción.
                elseif ($postulante->carrera_2da_opcion_id) {
                    $carrera2Id = $postulante->carrera_2da_opcion_id;
                    if ($this->hayCupo($cuposUsados[$carrera2Id] ?? 0, $cuposDisponibles[$carrera2Id] ?? 0)) {
                        $carreraAsignada       = $carrera2Id;
                        $opcionAsignada        = 'segunda';
                        $cuposUsados[$carrera2Id]++;
                    }
                }

                // Preparar insert en lote.
                $inserts[] = [
                    'gestion_id'       => $gestion->id,
                    'postulante_id'    => $postulante->id,
                    'carrera_id'       => $carreraAsignada,
                    'promedio_general' => $postulante->promedio_general,
                    'posicion_ranking' => $posicionRanking,
                    'opcion_asignada'  => $opcionAsignada,
                    'created_at'       => now(),
                    'updated_at'       => now(),
                ];

                // Actualizar estado del postulante.
                $nuevoEstado = $opcionAsignada === 'no_admitido' ? 'no_admitido' : 'admitido';
                DB::table('postulantes')
                    ->where('id', $postulante->id)
                    ->update(['estado' => $nuevoEstado]);

                // Contadores para el resumen.
                if ($nuevoEstado === 'admitido') {
                    $admitidos++;
                    $porCarrera[$carreraAsignada][$opcionAsignada] =
                        ($porCarrera[$carreraAsignada][$opcionAsignada] ?? 0) + 1;
                } else {
                    $noAdmitidos++;
                }

                // Insertar en lotes de 200 para performance.
                if (count($inserts) >= 200) {
                    DB::table('cupos_asignados')->insert($inserts);
                    $inserts = [];
                }
            }

            if (! empty($inserts)) {
                DB::table('cupos_asignados')->insert($inserts);
            }

            // Construir resumen por carrera para la respuesta.
            $carreras = Carrera::orderBy('nombre')->get();
            $resumenCarreras = $carreras->map(function (Carrera $carrera) use ($cuposUsados, $porCarrera) {
                return [
                    'carrera'          => $carrera->nombre,
                    'codigo'           => $carrera->codigo,
                    'cupo_maximo'      => $carrera->cupo_maximo,
                    'admitidos_total'  => $cuposUsados[$carrera->id] ?? 0,
                    'primera_opcion'   => $porCarrera[$carrera->id]['primera'] ?? 0,
                    'segunda_opcion'   => $porCarrera[$carrera->id]['segunda'] ?? 0,
                    'cupos_libres'     => $carrera->cupo_maximo - ($cuposUsados[$carrera->id] ?? 0),
                ];
            });

            return [
                'total_aprobados' => $aprobados->count(),
                'admitidos'       => $admitidos,
                'no_admitidos'    => $noAdmitidos,
                'por_carrera'     => $resumenCarreras,
            ];
        });

        return $resultado;
    }

    /**
     * Obtiene los postulantes aprobados con su promedio general calculado.
     * El promedio general es el promedio simple de los 4 promedios de materias.
     *
     * Se calcula directamente desde la tabla notas + examenes para garantizar
     * que el valor es correcto al momento de ejecutar el algoritmo.
     *
     * Orden: promedio_general DESC (ranking de mejor a peor).
     */
    private function obtenerAprobadosConPromedio(Gestion $gestion)
    {
        // Pesos desde configuracion_sistema.
        $p1 = (float) \App\Models\ConfiguracionSistema::obtener('peso_examen_1', 30);
        $p2 = (float) \App\Models\ConfiguracionSistema::obtener('peso_examen_2', 30);
        $p3 = (float) \App\Models\ConfiguracionSistema::obtener('peso_examen_3', 40);

        // Calcular promedio ponderado por materia usando SQL para performance.
        // Luego promediar las 4 materias para obtener el promedio general.
        $promediosPorPostulante = DB::table('notas')
            ->join('examenes', 'notas.examen_id', '=', 'examenes.id')
            ->join('postulantes', 'notas.postulante_id', '=', 'postulantes.id')
            ->where('notas.gestion_id', $gestion->id)
            ->where('postulantes.estado', 'aprobado')
            ->select(
                'notas.postulante_id',
                'examenes.materia_id',
                // Promedio ponderado de la materia: SUM(nota * peso) / 100
                DB::raw("ROUND(SUM(
                    CASE examenes.numero
                        WHEN 1 THEN notas.calificacion * {$p1}
                        WHEN 2 THEN notas.calificacion * {$p2}
                        WHEN 3 THEN notas.calificacion * {$p3}
                        ELSE 0
                    END
                ) / 100.0, 2) as promedio_materia")
            )
            ->groupBy('notas.postulante_id', 'examenes.materia_id');

        // Promedio general = promedio de los promedios de las 4 materias.
        $promediosGenerales = DB::table(DB::raw("({$promediosPorPostulante->toSql()}) as pm"))
            ->mergeBindings($promediosPorPostulante)
            ->select('postulante_id', DB::raw('ROUND(AVG(promedio_materia), 2) as promedio_general'))
            ->groupBy('postulante_id')
            ->orderByDesc('promedio_general');

        $promediosMap = $promediosGenerales->get()->keyBy('postulante_id');

        // Obtener los postulantes aprobados con sus opciones de carrera.
        $postulantes = Postulante::where('gestion_id', $gestion->id)
            ->where('estado', 'aprobado')
            ->get(['id', 'carrera_1ra_opcion_id', 'carrera_2da_opcion_id']);

        // Inyectar el promedio_general calculado y ordenar por ranking.
        return $postulantes->map(function (Postulante $p) use ($promediosMap) {
            $p->promedio_general = (float) ($promediosMap->get($p->id)?->promedio_general ?? 0);
            return $p;
        })->sortByDesc('promedio_general')->values();
    }

    /**
     * Verifica si hay cupo disponible en una carrera.
     */
    private function hayCupo(int $usados, int $maximo): bool
    {
        return $usados < $maximo;
    }

    /**
     * Devuelve el ranking actual de cupos asignados para una gestión.
     * Usado por el controller para mostrar los resultados sin re-ejecutar el algoritmo.
     */
    public function obtenerRanking(Gestion $gestion, ?int $carreraId = null, string $opcion = 'todos')
    {
        $query = CupoAsignado::where('gestion_id', $gestion->id)
            ->with(['postulante', 'carrera'])
            ->orderBy('posicion_ranking');

        if ($carreraId) {
            $query->where('carrera_id', $carreraId);
        }

        if ($opcion !== 'todos') {
            $query->where('opcion_asignada', $opcion);
        }

        return $query->paginate(20);
    }
}
