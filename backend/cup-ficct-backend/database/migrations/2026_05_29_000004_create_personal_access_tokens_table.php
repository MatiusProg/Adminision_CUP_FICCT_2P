<?php

/**
 * Módulo: Autenticación y Seguridad (Laravel Sanctum)
 * Fecha: 2026-05-29
 * Autores: Mateo Hurtado, Karen Ortega
 * Descripción: Tabla requerida por Laravel Sanctum para almacenar los tokens
 *              de acceso de la API. Cada vez que un usuario inicia sesión desde
 *              el frontend React, se genera aquí un token Bearer que autentica
 *              sus peticiones posteriores.
 *
 *              ¿Por qué es necesaria?
 *              El frontend (React) y el backend (Laravel) están separados, por lo
 *              que la autenticación es por token (no por sesión de navegador).
 *              Sanctum guarda esos tokens en esta tabla. Sin ella, el login por
 *              API no funciona.
 */

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Ejecuta la migración (crea la tabla).
     */
    public function up(): void
    {
        Schema::create('personal_access_tokens', function (Blueprint $table) {
            // Identificador único autoincremental (PK)
            $table->id();

            // Relación polimórfica: a qué modelo pertenece el token (ej. User)
            $table->morphs('tokenable');

            // Nombre descriptivo del token (ej. "auth_token")
            $table->string('name');

            // Hash del token (nunca se guarda el token en texto plano). Único
            $table->string('token', 64)->unique();

            // Lista de permisos/habilidades del token
            $table->text('abilities')->nullable();

            // Último uso del token (para auditoría/expiración)
            $table->timestamp('last_used_at')->nullable();

            // Fecha de expiración del token (nullable = no expira)
            $table->timestamp('expires_at')->nullable();

            // created_at y updated_at gestionados por Laravel
            $table->timestamps();
        });
    }

    /**
     * Revierte la migración (elimina la tabla).
     */
    public function down(): void
    {
        Schema::dropIfExists('personal_access_tokens');
    }
};
