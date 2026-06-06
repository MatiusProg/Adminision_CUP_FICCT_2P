<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Mejora 1 (idempotencia): guarda el ID del evento de Stripe ya procesado,
 * para descartar reenvíos duplicados del webhook. Único cuando no es null.
 */
return new class extends Migration {
    public function up(): void
    {
        Schema::table('pagos', function (Blueprint $table) {
            // Nullable: solo se llena cuando el webcheck procesa el evento.
            $table->string('stripe_event_id')->nullable()->after('stripe_session_id');
            // Índice único parcial: impide procesar dos veces el mismo evento,
            // pero permite múltiples filas con NULL (pagos aún sin confirmar).
            $table->unique('stripe_event_id');
        });
    }

    public function down(): void
    {
        Schema::table('pagos', function (Blueprint $table) {
            $table->dropUnique(['stripe_event_id']);
            $table->dropColumn('stripe_event_id');
        });
    }
};
