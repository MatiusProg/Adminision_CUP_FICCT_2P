<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Agrega columna 'activo' a la tabla users.
 * Necesaria para desactivación lógica de usuarios internos (UC-02).
 * Los postulantes también se benefician: un postulante desactivado no puede entrar.
 * DEFAULT true: todos los usuarios existentes quedan activos al correr esta migración.
 */
return new class extends Migration {
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            // Se agrega después de 'rol' para mantener orden lógico de columnas.
            $table->boolean('activo')->default(true)->after('rol');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('activo');
        });
    }
};