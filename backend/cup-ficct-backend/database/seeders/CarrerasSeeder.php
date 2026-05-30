<?php

namespace Database\Seeders;

use App\Models\Carrera;
use Illuminate\Database\Seeder;

/**
 * Seeder de las 4 carreras de la FICCT. Catálogo fijo. El cupo_maximo es un valor
 * de ejemplo configurable; ajustar según la realidad de cada gestión.
 */
class CarrerasSeeder extends Seeder
{
    public function run(): void
    {
        $carreras = [
            ['nombre' => 'Ingeniería en Sistemas', 'codigo' => 'SIS', 'cupo_maximo' => 120],
            ['nombre' => 'Ingeniería Informática', 'codigo' => 'INF', 'cupo_maximo' => 120],
            ['nombre' => 'Ingeniería en Redes y Telecomunicaciones', 'codigo' => 'RYT', 'cupo_maximo' => 80],
            ['nombre' => 'Ingeniería Robótica', 'codigo' => 'ROB', 'cupo_maximo' => 60],
        ];

        foreach ($carreras as $carrera) {
            // updateOrCreate evita duplicados si el seeder corre más de una vez.
            Carrera::updateOrCreate(['codigo' => $carrera['codigo']], $carrera);
        }
    }
}
