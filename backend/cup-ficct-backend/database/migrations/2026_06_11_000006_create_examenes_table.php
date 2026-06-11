<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Exámenes del CUP por materia por gestión.
 * Cada gestión tiene 12 exámenes: 3 por cada una de las 4 materias.
 * El número del examen (1, 2 o 3) determina qué peso aplicar al calcular promedios:
 *   examen 1 → configuracion_sistema.peso_examen_1 (30)
 *   examen 2 → configuracion_sistema.peso_examen_2 (30)
 *   examen 3 → configuracion_sistema.peso_examen_3 (40)
 * No hay campo peso aquí — los pesos son fijos y viven en configuracion_sistema.
 */
return new class extends Migration {
    public function up(): void
    {
        Schema::create('examenes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('gestion_id')
                  ->constrained('gestiones')
                  ->cascadeOnDelete();
            $table->foreignId('materia_id')
                  ->constrained('materias')
                  ->restrictOnDelete();
            // Número del examen dentro de la materia: 1, 2 o 3.
            $table->unsignedTinyInteger('numero');
            $table->timestamps();

            // No puede haber dos "Examen 1 de Computación" en la misma gestión.
            $table->unique(['gestion_id', 'materia_id', 'numero']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('examenes');
    }
};