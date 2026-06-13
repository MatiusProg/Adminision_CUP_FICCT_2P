<?php

namespace App\Imports;

use App\Models\ConfiguracionSistema;
use App\Models\Examen;
use App\Models\Gestion;
use App\Models\Nota;
use App\Models\Postulante;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Maatwebsite\Excel\Concerns\ToCollection;
use Maatwebsite\Excel\Concerns\WithHeadingRow;
use Maatwebsite\Excel\Concerns\WithValidation;
use Maatwebsite\Excel\Concerns\SkipsOnError;
use Maatwebsite\Excel\Concerns\SkipsErrors;

/**
 * Importación masiva de notas desde Excel/CSV (UC-12 ampliado).
 *
 * Formato esperado del archivo:
 *   Fila 1 (encabezados): ci | examen_1 | examen_2 | examen_3
 *   Filas siguientes: datos de cada postulante
 *
 * El archivo se genera con la plantilla descargable desde la UI.
 * Las notas deben ser valores entre 0 y 100 con hasta 2 decimales.
 * Si un postulante no se encuentra por CI, la fila se omite con advertencia.
 */
class ImportarNotasExcel implements ToCollection, WithHeadingRow, SkipsOnError
{
    use SkipsErrors;

    private int $materiaId;
    private Gestion $gestion;
    private array $errores   = [];
    private int $importadas  = 0;
    private int $omitidas    = 0;

    public function __construct(int $materiaId, Gestion $gestion)
    {
        $this->materiaId = $materiaId;
        $this->gestion   = $gestion;
    }

    /**
     * Procesa las filas del Excel.
     * Cada fila debe tener: ci, examen_1, examen_2, examen_3.
     */
    public function collection(Collection $rows): void
    {
        // Obtener los 3 exámenes de la materia en la gestión activa.
        $examenes = Examen::where('gestion_id', $this->gestion->id)
            ->where('materia_id', $this->materiaId)
            ->orderBy('numero')
            ->get()
            ->keyBy('numero');

        if ($examenes->count() < 3) {
            $this->errores[] = 'No se encontraron los 3 exámenes para esta materia en la gestión activa.';
            return;
        }

        // Construir mapa CI → postulante_id para búsqueda rápida.
        $postulantesMap = Postulante::where('gestion_id', $this->gestion->id)
            ->whereIn('estado', ['confirmado', 'aprobado', 'reprobado'])
            ->pluck('id', 'ci')
            ->toArray();

        $inserts = [];
        $ahora   = now()->toDateTimeString();

        foreach ($rows as $fila => $row) {
            $ci = trim((string) ($row['ci'] ?? ''));

            if (empty($ci)) {
                $this->omitidas++;
                continue;
            }

            // Buscar postulante por CI.
            $postulanteId = $postulantesMap[$ci] ?? null;
            if (! $postulanteId) {
                $this->errores[] = "Fila " . ($fila + 2) . ": CI '{$ci}' no encontrado en la gestión activa.";
                $this->omitidas++;
                continue;
            }

            // Procesar las 3 notas.
            foreach ([1, 2, 3] as $num) {
                $clave = "examen_{$num}";
                $valor = $row[$clave] ?? null;

                // Si la celda está vacía, omitir esa nota (no borrar la existente).
                if ($valor === null || $valor === '') continue;

                $calificacion = (float) $valor;

                // Validar rango 0-100.
                if ($calificacion < 0 || $calificacion > 100) {
                    $this->errores[] = "Fila " . ($fila + 2) . " CI '{$ci}': nota del examen {$num} fuera del rango (0-100).";
                    continue;
                }

                $examenId = $examenes->get($num)?->id;
                if (! $examenId) continue;

                // updateOrCreate via upsert en lote para performance.
                $inserts[] = [
                    'gestion_id'    => $this->gestion->id,
                    'postulante_id' => $postulanteId,
                    'examen_id'     => $examenId,
                    'calificacion'  => round($calificacion, 2),
                    'created_at'    => $ahora,
                    'updated_at'    => $ahora,
                ];
            }

            $this->importadas++;

            // Insertar en lotes de 300 para no saturar memoria.
            if (count($inserts) >= 300) {
                $this->insertarLote($inserts);
                $inserts = [];
            }
        }

        if (! empty($inserts)) {
            $this->insertarLote($inserts);
        }
    }

    /**
     * Inserta las notas usando upsert para manejar duplicados (actualiza si ya existe).
     */
    private function insertarLote(array $inserts): void
    {
        DB::table('notas')->upsert(
            $inserts,
            ['postulante_id', 'examen_id'], // columnas únicas
            ['calificacion', 'updated_at']  // columnas a actualizar si ya existe
        );
    }

    public function getImportadas(): int  { return $this->importadas; }
    public function getOmitidas(): int    { return $this->omitidas; }
    public function getErrores(): array   { return $this->errores; }
}
