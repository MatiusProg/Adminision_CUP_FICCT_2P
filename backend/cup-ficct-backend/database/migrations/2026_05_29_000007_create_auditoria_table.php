<?php

/**
 * Módulo: Auditoría (tabla adicional propuesta)
 * Fecha: 2026-05-29
 * Autores: Mateo Hurtado, Karen Ortega
 * Descripción: Registro de auditoría de acciones sensibles del sistema
 *              (creación/edición/eliminación de postulantes, confirmación de
 *              pagos, cambios de configuración). NO está en el documento §5.3,
 *              se añade por buen diseño.
 *
 *              ¿Por qué es necesaria?
 *              El documento (§1.3, problema P4) señala la "falta de trazabilidad"
 *              como una deficiencia clave del proceso actual. Esta tabla resuelve
 *              ese problema dejando un rastro de quién hizo qué y cuándo.
 *
 *              ¿Qué problema resuelve?
 *              Permite responder "¿quién confirmó este pago?" o "¿quién editó la
 *              nota de este postulante?", útil para defensa del proyecto y para
 *              detectar errores.
 *
 *              ¿Cómo se relaciona?
 *              Se vincula opcionalmente al usuario que realizó la acción (users).
 *              No fuerza relación con la entidad afectada (se guarda su tipo e id
 *              como texto) para no acoplarla a una sola tabla.
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
        Schema::create('auditoria', function (Blueprint $table) {
            // Identificador único autoincremental (PK)
            $table->id();

            // Usuario que ejecutó la acción (FK -> users.id, opcional)
            $table->foreignId('user_id')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();

            // Acción realizada (ej. "crear", "editar", "eliminar", "confirmar_pago")
            $table->string('accion', 100);

            // Tipo de entidad afectada (ej. "Postulante", "Pago", "Configuracion")
            $table->string('entidad', 100);

            // ID del registro afectado (nullable para acciones sin registro fijo)
            $table->unsignedBigInteger('entidad_id')->nullable();

            // Detalle libre de la acción (ej. JSON con valores anteriores/nuevos)
            $table->text('detalle')->nullable();

            // Dirección IP desde donde se realizó la acción
            $table->string('ip_address', 45)->nullable();

            // created_at y updated_at gestionados por Laravel
            $table->timestamps();
        });
    }

    /**
     * Revierte la migración (elimina la tabla).
     */
    public function down(): void
    {
        Schema::dropIfExists('auditoria');
    }
};
