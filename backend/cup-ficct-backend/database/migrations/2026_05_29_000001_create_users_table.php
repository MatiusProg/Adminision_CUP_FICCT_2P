<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Tabla de usuarios del sistema (reemplaza la migración por defecto de Laravel).
     * Incluye la columna `rol` desde el inicio. Todos los roles, incluido postulante,
     * usan el login estándar de Sanctum (email + password). El usuario del postulante
     * se crea recién tras el pago exitoso.
     *
     * Incluye también las tablas auxiliares que traía la migración por defecto de
     * Laravel (password_reset_tokens, sessions) para no perder funcionalidad.
     */
    public function up(): void
    {
        Schema::create('users', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('email')->unique();
            $table->timestamp('email_verified_at')->nullable();
            $table->string('password');

            // Rol del usuario. spatie/laravel-permission maneja los permisos finos;
            // esta columna es un discriminador rápido para la UI y el middleware.
            $table->enum('rol', [
                'admin',
                'coordinador_academico',
                'docente',
                'autoridad',
                'postulante',
            ])->default('postulante');

            $table->rememberToken();
            $table->timestamps();
        });

        // Tabla estándar de Laravel para recuperación de contraseña.
        Schema::create('password_reset_tokens', function (Blueprint $table) {
            $table->string('email')->primary();
            $table->string('token');
            $table->timestamp('created_at')->nullable();
        });

        // Tabla estándar de Laravel para el manejo de sesiones.
        Schema::create('sessions', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->foreignId('user_id')->nullable()->index();
            $table->string('ip_address', 45)->nullable();
            $table->text('user_agent')->nullable();
            $table->longText('payload');
            $table->integer('last_activity')->index();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('sessions');
        Schema::dropIfExists('password_reset_tokens');
        Schema::dropIfExists('users');
    }
};
