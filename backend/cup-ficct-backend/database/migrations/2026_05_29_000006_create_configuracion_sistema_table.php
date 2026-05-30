<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Almacén clave/valor de parámetros configurables del sistema. Nunca se
     * hardcodean estos valores en el código. Para Ciclo 1 la configuración es
     * global (sin gestion_id); la configuración por gestión es una posible mejora
     * de Ciclo 2.
     *
     * Claves esperadas: max_alumnos_por_grupo, max_grupos_por_docente,
     * peso_examen_1, peso_examen_2, peso_examen_3.
     */
    public function up(): void
    {
        Schema::create('configuracion_sistema', function (Blueprint $table) {
            $table->id();

            // Clave única del parámetro.
            $table->string('clave')->unique();

            // Valor del parámetro (guardado como texto; se castea al leerse).
            $table->string('valor');

            // Descripción legible del parámetro para la UI de administración.
            $table->string('descripcion')->nullable();

            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('configuracion_sistema');
    }
};
