<?php

namespace Database\Seeders;

use App\Models\Carrera;
use App\Models\Gestion;
use App\Models\Postulante;
use Illuminate\Database\Seeder;

/**
 * Seeder de postulantes de ejemplo. Solo 2, en la gestión actual y estado
 * 'confirmado' (representan postulantes que ya pagaron). La población masiva
 * (gestión actual completa + gestiones históricas) se cargará después.
 *
 * Importante: requiere que GestionesSeeder y CarrerasSeeder hayan corrido antes,
 * porque postulantes depende de gestion_id y de las carreras.
 */
class PostulantesSeeder extends Seeder
{
    public function run(): void
    {
        // Resolvemos la gestión actual y las carreras por código (no por ID fijo).
        $gestion = Gestion::actual();

        if (! $gestion) {
            // Sin gestión activa no se puede registrar ningún postulante.
            $this->command->warn('No hay gestión activa. Ejecutá GestionesSeeder primero. Se omite PostulantesSeeder.');
            return;
        }

        $sistemas = Carrera::where('codigo', 'SIS')->first();
        $informatica = Carrera::where('codigo', 'INF')->first();
        $redes = Carrera::where('codigo', 'RYT')->first();

        $postulantes = [
            [
                'ci' => '9876543',
                'nombres' => 'Lucía',
                'apellidos' => 'Vargas Mendoza',
                'fecha_nacimiento' => '2007-03-14',
                'sexo' => 'F',
                'direccion' => 'Av. Busch #123',
                'telefono' => '70011223',
                'email' => 'lucia.vargas@example.com',
                'colegio' => 'Colegio Nacional Florida',
                'ciudad' => 'Santa Cruz de la Sierra',
                'titulo_bachiller' => true,
                'estado' => 'confirmado',
                'carrera_1ra_opcion_id' => $sistemas?->id,
                'carrera_2da_opcion_id' => $informatica?->id,
            ],
            [
                'ci' => '8123456',
                'nombres' => 'Diego',
                'apellidos' => 'Antezana Rojas',
                'fecha_nacimiento' => '2006-11-02',
                'sexo' => 'M',
                'direccion' => 'Calle Warnes #456',
                'telefono' => '70044556',
                'email' => 'diego.antezana@example.com',
                'colegio' => 'Colegio La Salle',
                'ciudad' => 'Santa Cruz de la Sierra',
                'titulo_bachiller' => true,
                'estado' => 'confirmado',
                'carrera_1ra_opcion_id' => $informatica?->id,
                'carrera_2da_opcion_id' => $redes?->id,
            ],
        ];

        foreach ($postulantes as $postulante) {
            // El CI es único por gestión: la clave de búsqueda combina ambos.
            Postulante::updateOrCreate(
                ['ci' => $postulante['ci'], 'gestion_id' => $gestion->id],
                array_merge($postulante, ['gestion_id' => $gestion->id])
            );
        }
    }
}
