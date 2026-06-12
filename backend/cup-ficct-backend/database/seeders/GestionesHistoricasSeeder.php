<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Gestion;

/**
 * Siembra 3 gestiones históricas finalizadas.
 * La gestión activa (2026-2) ya existe — este seeder NO la toca.
 * Usa updateOrCreate para ser idempotente.
 *
 * Gestiones históricas:
 *   2026-1 → 1ra gestión del 2026 (ya terminó antes de la actual)
 *   2025-2 → 2da gestión del 2025
 *   2025-1 → 1ra gestión del 2025
 */
class GestionesHistoricasSeeder extends Seeder
{
    public function run(): void
    {
        $gestiones = [
            [
                'codigo'       => '2026-1',
                'anio'         => 2026,
                'periodo'      => 1,
                'estado'       => 'finalizada',
                'fecha_inicio' => '2026-01-05',
                'fecha_fin'    => '2026-04-30',
                'es_actual'    => false,
            ],
            [
                'codigo'       => '2025-2',
                'anio'         => 2025,
                'periodo'      => 2,
                'estado'       => 'finalizada',
                'fecha_inicio' => '2025-07-07',
                'fecha_fin'    => '2025-11-28',
                'es_actual'    => false,
            ],
            [
                'codigo'       => '2025-1',
                'anio'         => 2025,
                'periodo'      => 1,
                'estado'       => 'finalizada',
                'fecha_inicio' => '2025-01-06',
                'fecha_fin'    => '2025-04-25',
                'es_actual'    => false,
            ],
        ];

        foreach ($gestiones as $gestion) {
            Gestion::updateOrCreate(
                ['codigo' => $gestion['codigo']],
                $gestion
            );
        }

        $this->command->info('✅ 3 gestiones históricas sembradas correctamente.');
    }
}