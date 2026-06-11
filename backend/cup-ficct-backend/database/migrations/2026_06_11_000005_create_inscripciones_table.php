<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Inscripciones de postulantes a grupos.
 * Cada postulante tiene exactamente 4 inscripciones por gestión (una por materia).
 * El gestion_id es técnicamente derivable desde el grupo, pero se incluye
 * directamente para simplificar consultas de reportes sin JOINs extra.
 */
return new class extends Migration {
    public function up(): void
    {
        Schema::create('inscripciones', function (Blueprint $table) {
            $table->id();
            $table->foreignId('gestion_id')
                  ->constrained('gestiones')
                  ->cascadeOnDelete();
            $table->foreignId('postulante_id')
                  ->constrained('postulantes')
                  ->cascadeOnDelete();
            $table->foreignId('grupo_id')
                  ->constrained('grupos')
                  ->cascadeOnDelete();
            // Fecha en que se realizó la inscripción al grupo.
            $table->timestamp('fecha_inscripcion')->useCurrent();
            $table->timestamps();

            // Un postulante no puede estar dos veces en el mismo grupo.
            $table->unique(['postulante_id', 'grupo_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('inscripciones');
    }
};