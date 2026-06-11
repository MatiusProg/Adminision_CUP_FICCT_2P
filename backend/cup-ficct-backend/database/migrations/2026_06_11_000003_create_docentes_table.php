<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Catálogo de docentes del CUP-FICCT.
 * Persisten entre gestiones — no llevan gestion_id.
 * Un docente puede o no tener cuenta de usuario (user_id nullable).
 * Sin cuenta de usuario, el docente existe en el sistema pero no puede entrar.
 * La desactivación es lógica (campo activo), no física, para preservar historial.
 */
return new class extends Migration {
    public function up(): void
    {
        Schema::create('docentes', function (Blueprint $table) {
            $table->id();
            // Datos de identidad
            $table->string('ci', 20)->unique();
            $table->string('nombres');
            $table->string('apellidos');
            $table->string('email')->unique()->nullable();
            $table->string('telefono', 30)->nullable();
            // Datos académicos (requisitos del sistema según PROYECTO_CUP)
            $table->string('titulo')->nullable();
            $table->string('grado_academico')->nullable();
            $table->boolean('diplomado_docencia')->default(false);
            // Cuenta de acceso al sistema (opcional — se enlaza desde UC-02)
            $table->foreignId('user_id')
                  ->nullable()
                  ->constrained('users')
                  ->nullOnDelete();
            // Desactivación lógica: false = no puede entrar ni ser asignado a grupos
            $table->boolean('activo')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('docentes');
    }
};