<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Calificaciones de los postulantes en cada examen.
 * Una fila por (postulante, examen). 12 filas por postulante por gestión.
 *
 * Fórmula de promedio por materia:
 *   promedio = (nota_examen1 × 30 + nota_examen2 × 30 + nota_examen3 × 40) / 100
 *
 * Regla de aprobación:
 *   APROBADO si TODAS las materias tienen promedio >= nota_minima_aprobacion (60).
 *   REPROBADO si cualquier materia tiene promedio < 60.
 *
 * El gestion_id se incluye directamente (aunque derivable desde examen → gestión)
 * para simplificar consultas de reportes sin JOINs extra.
 */
return new class extends Migration {
    public function up(): void
    {
        Schema::create('notas', function (Blueprint $table) {
            $table->id();
            $table->foreignId('gestion_id')
                  ->constrained('gestiones')
                  ->cascadeOnDelete();
            $table->foreignId('postulante_id')
                  ->constrained('postulantes')
                  ->cascadeOnDelete();
            $table->foreignId('examen_id')
                  ->constrained('examenes')
                  ->cascadeOnDelete();
            // La calificación va de 0 a 100 con hasta 2 decimales.
            $table->decimal('calificacion', 5, 2);
            $table->timestamps();

            // Un postulante tiene exactamente una nota por examen.
            $table->unique(['postulante_id', 'examen_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('notas');
    }
};