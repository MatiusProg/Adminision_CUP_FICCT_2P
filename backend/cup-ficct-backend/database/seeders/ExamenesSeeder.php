<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use App\Models\Gestion;
use App\Models\Materia;

/**
 * Siembra los exámenes del CUP: 3 por materia por gestión = 12 por gestión.
 * Con 4 gestiones (3 históricas + 1 activa) = 48 exámenes en total.
 *
 * No hay campo 'peso' en la tabla — los pesos son fijos en configuracion_sistema:
 *   Examen 1 → peso_examen_1 (30)
 *   Examen 2 → peso_examen_2 (30)
 *   Examen 3 → peso_examen_3 (40)
 *
 * Usa insert por lote para mayor velocidad.
 * Usa updateOrCreate implícitamente verificando existencia para ser idempotente.
 */
class ExamenesSeeder extends Seeder
{
    public function run(): void
    {
        $gestiones = Gestion::all();
        $materias  = Materia::all();

        if ($materias->isEmpty()) {
            $this->command->error('❌ No hay materias. Corré MateriasSeeder primero.');
            return;
        }

        $ahora    = now()->toDateTimeString();
        $examenes = [];

        foreach ($gestiones as $gestion) {
            foreach ($materias as $materia) {
                foreach ([1, 2, 3] as $numero) {
                    // Verificar si ya existe para no duplicar (idempotencia).
                    $existe = DB::table('examenes')
                        ->where('gestion_id', $gestion->id)
                        ->where('materia_id', $materia->id)
                        ->where('numero', $numero)
                        ->exists();

                    if (!$existe) {
                        $examenes[] = [
                            'gestion_id' => $gestion->id,
                            'materia_id' => $materia->id,
                            'numero'     => $numero,
                            'created_at' => $ahora,
                            'updated_at' => $ahora,
                        ];
                    }
                }
            }
        }

        if (empty($examenes)) {
            $this->command->info('ℹ️  Todos los exámenes ya existen. Nada que sembrar.');
            return;
        }

        // Inserción por lotes de 100 para no saturar el pooler.
        foreach (array_chunk($examenes, 100) as $lote) {
            DB::table('examenes')->insert($lote);
        }

        $total = count($examenes);
        $this->command->info("✅ {$total} exámenes sembrados correctamente.");
    }
}