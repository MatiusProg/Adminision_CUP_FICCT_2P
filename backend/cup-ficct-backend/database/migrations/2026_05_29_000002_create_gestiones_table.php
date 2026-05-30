<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Tabla raíz del período académico (gestión). Cada corrida del CUP es una
     * gestión. Hay 2 gestiones por año (una antes de cada semestre), ej. 2026-1, 2026-2.
     * La columna `estado` controla qué habilita el sistema en cada fase.
     */
    public function up(): void
    {
        Schema::create('gestiones', function (Blueprint $table) {
            $table->id();

            // Identificador legible de la gestión, ej. "2026-2". Único en todo el sistema.
            $table->string('codigo')->unique();

            // Año calendario de la gestión.
            $table->integer('anio');

            // Periodo dentro del año: 1 (primer semestre) o 2 (segundo semestre).
            $table->smallInteger('periodo');

            // Fase actual de la gestión. Gobierna el feature gating:
            // - inscripciones_abiertas: se aceptan postulantes (se paga e ingresa)
            // - cup_iniciado: ya no se aceptan postulantes; arranca la organización
            // - grupos_generados: se dividieron los grupos según el total de inscritos
            // - docentes_asignados: se asignaron docentes; recién aquí el postulante ve materias
            // - en_curso: el CUP está dictándose (exámenes, notas)
            // - finalizada: gestión cerrada; queda como histórico de solo lectura
            $table->enum('estado', [
                'inscripciones_abiertas',
                'cup_iniciado',
                'grupos_generados',
                'docentes_asignados',
                'en_curso',
                'finalizada',
            ])->default('inscripciones_abiertas');

            // Rango de fechas de la gestión (opcional, informativo).
            $table->date('fecha_inicio')->nullable();
            $table->date('fecha_fin')->nullable();

            // Marca la gestión activa. Solo una debe estar en true a la vez
            // (la unicidad se garantiza por lógica de aplicación / servicio).
            $table->boolean('es_actual')->default(false);

            $table->timestamps();

            // Una persona no puede repetir periodo dentro del mismo año.
            $table->unique(['anio', 'periodo']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('gestiones');
    }
};
