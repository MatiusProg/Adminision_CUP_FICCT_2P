<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Resultado del algoritmo de asignación de cupos por carrera.
 * Se genera una fila por postulante aprobado al correr UC-16.
 *
 * Algoritmo (UC-16):
 *   1. Tomar todos los postulantes con estado 'aprobado' de la gestión.
 *   2. Ordenar por promedio_general descendente (ranking).
 *   3. Para cada postulante en orden:
 *      - Si hay cupo en su 1ra opción → asignar, opcion_asignada = 'primera'
 *      - Si no, si hay cupo en su 2da opción → asignar, opcion_asignada = 'segunda'
 *      - Si no hay cupo en ninguna → opcion_asignada = 'no_admitido', carrera_id = null
 *   4. Actualizar postulantes.estado según el resultado (admitido / no_admitido).
 */
return new class extends Migration {
    public function up(): void
    {
        Schema::create('cupos_asignados', function (Blueprint $table) {
            $table->id();
            $table->foreignId('gestion_id')
                  ->constrained('gestiones')
                  ->cascadeOnDelete();
            $table->foreignId('postulante_id')
                  ->constrained('postulantes')
                  ->cascadeOnDelete();
            // Null cuando opcion_asignada = 'no_admitido'.
            $table->foreignId('carrera_id')
                  ->nullable()
                  ->constrained('carreras')
                  ->nullOnDelete();
            // Promedio de todas las materias usado para el ranking.
            $table->decimal('promedio_general', 5, 2);
            // Posición en el ranking global de aprobados de la gestión.
            $table->unsignedInteger('posicion_ranking');
            // Resultado de la asignación.
            $table->string('opcion_asignada', 20);
            $table->timestamps();

            // Un postulante tiene un solo resultado de cupos por gestión.
            $table->unique(['gestion_id', 'postulante_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cupos_asignados');
    }
};