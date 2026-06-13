<?php

namespace App\Services;

use App\Models\ConfiguracionSistema;
use App\Models\Examen;
use App\Models\Gestion;
use App\Models\Grupo;
use App\Models\Inscripcion;
use App\Models\Materia;
use App\Models\Postulante;
use Illuminate\Support\Facades\DB;

/**
 * Servicio de generación automática de grupos (UC-14).
 *
 * ALGORITMO CEIL (pregunta directa del examen):
 *   num_grupos = CEIL(total_postulantes_confirmados / max_alumnos_por_grupo)
 *
 * Por cada gestión y cada materia se generan N grupos donde N = CEIL(total/max).
 * Cada postulante confirmado queda inscrito en exactamente 4 grupos (uno por materia),
 * asignado secuencialmente para distribuir la carga equitativamente entre grupos.
 *
 * Además de los grupos, este servicio crea los 12 exámenes de la gestión
 * (3 por cada una de las 4 materias) si aún no existen.
 *
 * Nomenclatura de grupos: letra alfabética + guión + código de materia.
 *   Ej: A-COMP, B-COMP, ..., A-MAT, B-MAT, ...
 * Si hay más de 26 grupos (caso extremo): AA-COMP, AB-COMP, etc.
 */
class AsignacionGruposService
{
    /**
     * Horarios predefinidos disponibles para asignar a grupos.
     * Lunes a Viernes en 3 turnos (mañana, tarde, noche) con 2 bloques cada uno.
     * Se usan como lista de selección en la UI para evitar errores de escritura
     * y facilitar la validación de conflictos de horario en UC-15.
     */
    public const HORARIOS = [
        'M1' => 'Lunes a Viernes 07:00-09:00',
        'M2' => 'Lunes a Viernes 09:00-11:00',
        'M3' => 'Lunes a Viernes 11:00-13:00',
        'T1' => 'Lunes a Viernes 14:00-16:00',
        'T2' => 'Lunes a Viernes 16:00-18:00',
        'N1' => 'Lunes a Viernes 19:00-21:00',
    ];

    /**
     * Aulas disponibles para asignación automática inicial.
     * El admin puede modificarlas después desde la página de grupos.
     */
    private const AULAS = [
        'A-101', 'A-102', 'A-103', 'A-104',
        'B-201', 'B-202', 'B-203', 'B-204',
        'C-301', 'C-302', 'C-303', 'C-304',
        'D-401', 'D-402', 'D-403', 'D-404',
    ];

    /**
     * Genera los grupos para la gestión activa y distribuye los postulantes.
     *
     * Precondiciones:
     *   - La gestión debe estar en fase 'cup_iniciado'.
     *   - No deben existir grupos previos para esta gestión.
     *   - Debe haber al menos 1 postulante confirmado.
     *
     * @throws \RuntimeException Si no se cumplen las precondiciones.
     * @return array Resumen de la generación: grupos creados, inscripciones, exámenes.
     */
    public function generarGrupos(Gestion $gestion): array
    {
        // Verificar que la gestión está en la fase correcta.
        if ($gestion->estado !== 'cup_iniciado') {
            throw new \RuntimeException(
                "La gestión debe estar en fase 'cup_iniciado' para generar grupos. " .
                "Fase actual: {$gestion->estado}."
            );
        }

        // Verificar que no existen grupos previos para esta gestión.
        $gruposExistentes = Grupo::where('gestion_id', $gestion->id)->count();
        if ($gruposExistentes > 0) {
            throw new \RuntimeException(
                "Ya existen {$gruposExistentes} grupos generados para esta gestión. " .
                "No se puede regenerar sin eliminar los grupos existentes."
            );
        }

        // Obtener parámetro configurable: máximo de alumnos por grupo.
        $maxAlumnosPorGrupo = (int) ConfiguracionSistema::obtener('max_alumnos_por_grupo', 60);

        // Contar postulantes confirmados de la gestión.
        $totalPostulantes = Postulante::where('gestion_id', $gestion->id)
            ->where('estado', 'confirmado')
            ->count();

        if ($totalPostulantes === 0) {
            throw new \RuntimeException(
                "No hay postulantes confirmados en la gestión {$gestion->codigo}. " .
                "No se pueden generar grupos sin postulantes."
            );
        }

        // ALGORITMO CEIL — fórmula central del UC-14.
        // La cantidad de grupos es el mínimo necesario para que ningún grupo
        // supere el máximo de alumnos configurado.
        $numGrupos = (int) ceil($totalPostulantes / $maxAlumnosPorGrupo);

        $materias = Materia::orderBy('id')->get();

        $resultado = DB::transaction(function () use (
            $gestion, $materias, $numGrupos, $maxAlumnosPorGrupo, $totalPostulantes
        ) {
            // 1. Crear grupos para cada materia.
            $gruposPorMateria = $this->crearGrupos($gestion, $materias, $numGrupos, $maxAlumnosPorGrupo);

            // 2. Distribuir postulantes en los grupos (inscripciones).
            $totalInscripciones = $this->distribuirPostulantes($gestion, $materias, $gruposPorMateria);

            // 3. Crear los 12 exámenes de la gestión (3 por materia × 4 materias).
            $totalExamenes = $this->crearExamenes($gestion, $materias);

            return [
                'total_postulantes'   => $totalPostulantes,
                'num_grupos'          => $numGrupos,
                'total_grupos'        => $numGrupos * $materias->count(),
                'max_alumnos_grupo'   => $maxAlumnosPorGrupo,
                'total_inscripciones' => $totalInscripciones,
                'total_examenes'      => $totalExamenes,
                'materias'            => $materias->count(),
            ];
        });

        return $resultado;
    }

    /**
     * Crea los grupos para cada materia usando la nomenclatura alfabética.
     * A-COMP, B-COMP, ..., A-MAT, B-MAT, ...
     *
     * Los horarios y aulas se asignan de forma distribuida entre los disponibles
     * como punto de partida. El admin puede modificarlos después.
     *
     * @return array<int, array<int>> Mapa materia_id => [grupo_id, ...]
     */
    private function crearGrupos(
        Gestion $gestion,
        $materias,
        int $numGrupos,
        int $capacidad
    ): array {
        $ahora           = now()->toDateTimeString();
        $horariosKeys    = array_keys(self::HORARIOS);
        $totalHorarios   = count($horariosKeys);
        $gruposInsert    = [];
        $gruposPorMateria = [];

        foreach ($materias as $materia) {
            $gruposPorMateria[$materia->id] = [];

            for ($i = 0; $i < $numGrupos; $i++) {
                // Generar nombre alfabético: A, B, C, ..., Z, AA, AB, ...
                $nombre = $this->generarLetraGrupo($i) . '-' . $materia->codigo;

                // Distribuir horarios y aulas de forma cíclica entre grupos.
                $horarioCodigo = $horariosKeys[$i % $totalHorarios];
                $horario       = self::HORARIOS[$horarioCodigo];
                $aula          = self::AULAS[$i % count(self::AULAS)];

                $gruposInsert[] = [
                    'gestion_id' => $gestion->id,
                    'materia_id' => $materia->id,
                    'docente_id' => null,
                    'nombre'     => $nombre,
                    'aula'       => $aula,
                    'horario'    => $horario,
                    'capacidad'  => $capacidad,
                    'created_at' => $ahora,
                    'updated_at' => $ahora,
                ];
            }
        }

        // Inserción en lote para performance con grandes volúmenes.
        DB::table('grupos')->insert($gruposInsert);

        // Recuperar IDs insertados agrupados por materia.
        foreach ($materias as $materia) {
            $gruposPorMateria[$materia->id] = DB::table('grupos')
                ->where('gestion_id', $gestion->id)
                ->where('materia_id', $materia->id)
                ->orderBy('id')
                ->pluck('id')
                ->toArray();
        }

        return $gruposPorMateria;
    }

    /**
     * Distribuye los postulantes confirmados entre los grupos de cada materia.
     * La distribución es secuencial (round-robin) para balancear la carga:
     * el postulante 1 va al grupo A, el 2 al grupo B, ..., el N+1 vuelve al grupo A.
     *
     * Cada postulante queda inscrito en exactamente 4 grupos (uno por materia).
     *
     * @return int Total de inscripciones creadas.
     */
    private function distribuirPostulantes(
        Gestion $gestion,
        $materias,
        array $gruposPorMateria
    ): int {
        $ahora = now()->toDateTimeString();

        // Obtener IDs de postulantes confirmados en orden estable.
        $postIds = Postulante::where('gestion_id', $gestion->id)
            ->where('estado', 'confirmado')
            ->orderBy('id')
            ->pluck('id')
            ->toArray();

        $inscripciones    = [];
        $totalInscripciones = 0;

        foreach ($materias as $materia) {
            $grupos    = $gruposPorMateria[$materia->id];
            $numGrupos = count($grupos);

            foreach ($postIds as $idx => $postId) {
                // Round-robin: cada postulante va al grupo según su posición.
                $grupoId = $grupos[$idx % $numGrupos];

                $inscripciones[] = [
                    'gestion_id'        => $gestion->id,
                    'postulante_id'     => $postId,
                    'grupo_id'          => $grupoId,
                    'fecha_inscripcion' => $ahora,
                    'created_at'        => $ahora,
                    'updated_at'        => $ahora,
                ];

                // Insertar en lotes de 500 para evitar límites de memoria.
                if (count($inscripciones) >= 500) {
                    DB::table('inscripciones')->insert($inscripciones);
                    $totalInscripciones += count($inscripciones);
                    $inscripciones = [];
                }
            }
        }

        if (! empty($inscripciones)) {
            DB::table('inscripciones')->insert($inscripciones);
            $totalInscripciones += count($inscripciones);
        }

        return $totalInscripciones;
    }

    /**
     * Crea los 12 exámenes de la gestión: 3 por cada materia (números 1, 2 y 3).
     * Si ya existen los exámenes (por idempotencia), los omite.
     *
     * @return int Total de exámenes creados.
     */
    private function crearExamenes(Gestion $gestion, $materias): int
    {
        $ahora         = now()->toDateTimeString();
        $examenesInsert = [];
        $existentes    = Examen::where('gestion_id', $gestion->id)->count();

        // Si ya existen los 12 exámenes, no repetir.
        if ($existentes >= $materias->count() * 3) {
            return 0;
        }

        foreach ($materias as $materia) {
            for ($numero = 1; $numero <= 3; $numero++) {
                // Verificar que no existe ya este examen específico.
                $yaExiste = Examen::where('gestion_id', $gestion->id)
                    ->where('materia_id', $materia->id)
                    ->where('numero', $numero)
                    ->exists();

                if (! $yaExiste) {
                    $examenesInsert[] = [
                        'gestion_id' => $gestion->id,
                        'materia_id' => $materia->id,
                        'numero'     => $numero,
                        'created_at' => $ahora,
                        'updated_at' => $ahora,
                    ];
                }
            }
        }

        if (! empty($examenesInsert)) {
            DB::table('examenes')->insert($examenesInsert);
        }

        return count($examenesInsert);
    }

    /**
     * Convierte un índice numérico (0-based) en letra(s) para nombrar grupos.
     * 0 → A, 1 → B, ..., 25 → Z, 26 → AA, 27 → AB, ...
     * Permite hasta 26×27 grupos por materia (caso extremamente improbable).
     */
    private function generarLetraGrupo(int $indice): string
    {
        $letras = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

        if ($indice < 26) {
            return $letras[$indice];
        }

        // Para más de 26 grupos: combinación de dos letras.
        $primera  = $letras[(int) floor($indice / 26) - 1];
        $segunda  = $letras[$indice % 26];
        return $primera . $segunda;
    }
}
