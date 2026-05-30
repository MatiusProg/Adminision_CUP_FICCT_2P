<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

/**
 * Seeder principal. Llama a los demás seeders en orden de dependencias:
 *  1. Gestiones      → necesaria antes que postulantes (FK gestion_id)
 *  2. Carreras       → necesarias antes que postulantes (FK carrera)
 *  3. Configuración  → independiente
 *  4. Users          → independiente (usuarios administrativos)
 *  5. Postulantes    → depende de gestión y carreras; va al final
 */
class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call([
            GestionesSeeder::class,
            CarrerasSeeder::class,
            ConfiguracionSistemaSeeder::class,
            UsersSeeder::class,
            PostulantesSeeder::class,
        ]);
    }
}
