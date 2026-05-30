<?php

namespace Database\Seeders;

use App\Models\Gestion;
use Illuminate\Database\Seeder;

/**
 * Seeder de gestiones. Crea la gestión ACTUAL (es_actual = true) sobre la que se
 * opera. Las gestiones históricas (≥3 anteriores) se cargarán después con la
 * población masiva; por ahora solo la actual, necesaria para registrar postulantes.
 */
class GestionesSeeder extends Seeder
{
    public function run(): void
    {
        // Gestión actual: segundo período de 2026, aceptando postulantes.
        Gestion::updateOrCreate(
            ['codigo' => '2026-2'],
            [
                'anio' => 2026,
                'periodo' => 2,
                'estado' => 'inscripciones_abiertas',
                'fecha_inicio' => '2026-06-01',
                'fecha_fin' => null,
                'es_actual' => true,
            ]
        );
    }
}
