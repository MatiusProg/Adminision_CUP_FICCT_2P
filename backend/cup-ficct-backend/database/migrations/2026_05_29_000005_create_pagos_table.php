<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Registro de pagos de inscripción. El pago COMPLETADO es lo que dispara la
     * creación del postulante (vía webhook de Stripe). Para Ciclo 1, un pago por
     * postulante.
     *
     * Nota de implementación: como el postulante no existe antes del pago, el
     * postulante_id es nullable hasta que el webhook crea el postulante y enlaza
     * el pago. Los datos del formulario viajan en la metadata de la sesión Stripe.
     */
    public function up(): void
    {
        Schema::create('pagos', function (Blueprint $table) {
            $table->id();

            // Gestión en la que se realiza el pago.
            $table->foreignId('gestion_id')->constrained('gestiones');

            // Postulante asociado. Nullable: al crear la sesión de Stripe el postulante
            // aún no existe; el webhook lo crea y luego enlaza este pago.
            $table->foreignId('postulante_id')->nullable()->constrained('postulantes')->nullOnDelete();

            // Monto y moneda del pago.
            $table->decimal('monto', 10, 2);
            $table->string('moneda', 3)->default('BOB');

            // Estado del pago.
            $table->enum('estado', ['pendiente', 'completado', 'fallido'])->default('pendiente');

            // Identificador de la sesión de Stripe Checkout (para conciliar el webhook).
            $table->string('stripe_session_id')->nullable()->index();

            // Método de pago. Stripe es el principal; paypal queda como respaldo.
            $table->enum('metodo', ['stripe', 'paypal'])->default('stripe');

            // Fecha efectiva del pago (se setea al completarse).
            $table->timestamp('fecha_pago')->nullable();

            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('pagos');
    }
};
