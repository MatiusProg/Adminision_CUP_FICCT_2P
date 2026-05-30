<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Catálogo de las 4 carreras de la FICCT. No depende de la gestión:
     * las carreras persisten entre periodos, por eso NO lleva gestion_id.
     */
    public function up(): void
    {
        Schema::create('carreras', function (Blueprint $table) {
            $table->id();

            // Nombre completo de la carrera.
            $table->string('nombre');

            // Código corto único de la carrera, ej. "INF", "SIS".
            $table->string('codigo')->unique();

            // Cupo máximo de admitidos por gestión para esta carrera.
            $table->integer('cupo_maximo');

            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('carreras');
    }
};
