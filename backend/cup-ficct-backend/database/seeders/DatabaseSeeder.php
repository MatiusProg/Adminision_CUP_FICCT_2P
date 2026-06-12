<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

/**
 * Seeder principal. Llama a todos los seeders en orden de dependencias.
 *
 * CICLO 1 (datos base del sistema):
 *   1. GestionesSeeder         → gestión activa 2026-2
 *   2. CarrerasSeeder          → 4 carreras FICCT
 *   3. ConfiguracionSistemaSeeder → parámetros del sistema
 *   4. UsersSeeder             → usuarios administrativos (admin, coordinador, autoridad)
 *   5. PostulantesSeeder       → pocos postulantes de prueba
 *
 * CICLO 2 (datos académicos y carga masiva):
 *   6. MateriasSeeder          → 4 materias del CUP (COMP, MAT, ING, FIS)
 *   7. GestionesHistoricasSeeder → 3 gestiones anteriores finalizadas
 *   8. ExamenesSeeder          → 12 exámenes por gestión (48 en total)
 *   9. CargaMasivaSeeder       → ~2900 postulantes con notas, grupos, cupos e inscripciones
 *
 * NOTA: en base limpia correr en este orden exacto.
 * En base existente con datos, usar --class para correr seeders individuales.
 */
class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // ── Ciclo 1 ───────────────────────────────────────────────────────────
        $this->call([
            GestionesSeeder::class,
            CarrerasSeeder::class,
            ConfiguracionSistemaSeeder::class,
            UsersSeeder::class,
            PostulantesSeeder::class,
        ]);

        // ── Ciclo 2 ───────────────────────────────────────────────────────────
        $this->call([
            MateriasSeeder::class,
            GestionesHistoricasSeeder::class,
            ExamenesSeeder::class,
            CargaMasivaSeeder::class,
            PagosMasivoSeeder::class,
        ]);
    }
}