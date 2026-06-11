<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Grupos de estudio por materia por gestión.
 * Se generan automáticamente con la fórmula:
 *   CEIL(total_postulantes / max_alumnos_por_grupo) grupos por materia.
 * Cada postulante pertenece a exactamente 4 grupos (uno por materia).
 * El docente se asigna después de generar los grupos (nullable al crear).
 */
return new class extends Migration {
    public function up(): void
    {
        Schema::create('grupos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('gestion_id')
                  ->constrained('gestiones')
                  ->cascadeOnDelete();
            $table->foreignId('materia_id')
                  ->constrained('materias')
                  ->restrictOnDelete();
            // El docente se asigna después (UC-15); puede estar sin docente inicialmente.
            $table->foreignId('docente_id')
                  ->nullable()
                  ->constrained('docentes')
                  ->nullOnDelete();
            // Nombre descriptivo del grupo (ej. G1-COMP, G2-MAT)
            $table->string('nombre', 20);
            // Datos logísticos del grupo
            $table->string('aula', 20)->nullable();
            $table->string('horario')->nullable();
            // Capacidad máxima de alumnos (por defecto = max_alumnos_por_grupo de config)
            $table->unsignedInteger('capacidad');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('grupos');
    }
};