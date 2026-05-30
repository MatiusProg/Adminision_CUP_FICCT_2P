<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Entidad central del sistema. El postulante se crea ÚNICAMENTE tras un pago
     * exitoso (vía webhook de Stripe). No existe un estado previo "pendiente_pago":
     * antes del pago los datos viven solo en el frontend y no se persisten.
     *
     * El CI es único POR GESTIÓN (no global): una misma persona puede postular en
     * gestiones distintas (repitente). La lógica de repitencia es de Ciclo 2; aquí
     * solo se permite el dato.
     */
    public function up(): void
    {
        Schema::create('postulantes', function (Blueprint $table) {
            $table->id();

            // Gestión a la que pertenece esta postulación.
            $table->foreignId('gestion_id')->constrained('gestiones');

            // Usuario del sistema asociado al postulante. Nullable porque el usuario
            // se crea junto con el postulante tras el pago; se enlaza en ese momento.
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();

            // Carrera de primera y segunda opción del postulante.
            $table->foreignId('carrera_1ra_opcion_id')->constrained('carreras');
            $table->foreignId('carrera_2da_opcion_id')->constrained('carreras');

            // Cédula de identidad. NO es única global: ver índice compuesto abajo.
            $table->string('ci');

            // Datos personales.
            $table->string('nombres');
            $table->string('apellidos');
            $table->date('fecha_nacimiento');
            $table->enum('sexo', ['M', 'F']);
            $table->string('direccion')->nullable();
            $table->string('telefono')->nullable();
            $table->string('email')->nullable();

            // Datos académicos de origen.
            $table->string('colegio')->nullable();
            $table->string('ciudad')->nullable();

            // El título de bachiller es solo un booleano: el documento NO se almacena
            // en el sistema, solo se marca si fue presentado (verificación manual).
            $table->boolean('titulo_bachiller')->default(false);

            // Estado del postulante. Nace en "confirmado" (ya pagó). No hay pendiente_pago.
            $table->enum('estado', [
                'confirmado',
                'aprobado',
                'reprobado',
                'admitido',
                'no_admitido',
            ])->default('confirmado');

            $table->timestamps();

            // Unicidad del CI POR GESTIÓN: permite repitentes entre gestiones,
            // pero impide duplicar a la misma persona dentro de una misma gestión.
            $table->unique(['ci', 'gestion_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('postulantes');
    }
};
