<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Catálogo de las 4 materias del CUP-FICCT.
 * Entidad permanente: no cambia entre gestiones.
 * No lleva gestion_id — es un catálogo global igual que 'carreras'.
 * Las 4 materias: Computación, Matemáticas, Inglés, Física.
 */
return new class extends Migration {
    public function up(): void
    {
        Schema::create('materias', function (Blueprint $table) {
            $table->id();
            $table->string('nombre');
            // Código corto para uso interno y nombres de grupos (ej. G1-COMP).
            $table->string('codigo', 10)->unique();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('materias');
    }
};