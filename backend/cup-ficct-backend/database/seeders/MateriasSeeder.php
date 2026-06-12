<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Materia;

/**
 * Siembra las 4 materias fijas del CUP-FICCT.
 * Son un catálogo permanente — no cambian entre gestiones.
 * Usa updateOrCreate para que sea idempotente (se puede correr más de una vez sin duplicar).
 */
class MateriasSeeder extends Seeder
{
    public function run(): void
    {
        $materias = [
            ['nombre' => 'Computación',  'codigo' => 'COMP'],
            ['nombre' => 'Matemáticas',  'codigo' => 'MAT'],
            ['nombre' => 'Inglés',       'codigo' => 'ING'],
            ['nombre' => 'Física',       'codigo' => 'FIS'],
        ];

        foreach ($materias as $materia) {
            Materia::updateOrCreate(
                ['codigo' => $materia['codigo']],
                ['nombre' => $materia['nombre']]
            );
        }

        $this->command->info('✅ 4 materias sembradas correctamente.');
    }
}