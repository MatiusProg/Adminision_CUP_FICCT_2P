<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Modelo Gestion — período académico del CUP (2 por año, ej. 2026-2).
 *
 * La columna `estado` gobierna qué habilita el sistema en cada fase del proceso.
 * La gestión marcada con `es_actual = true` es sobre la que se opera; el resto
 * son históricas (solo lectura).
 */
class Gestion extends Model
{
    use HasFactory;

    // Laravel pluraliza "Gestion" como "gestions"; forzamos el nombre real.
    protected $table = 'gestiones';

    protected $fillable = [
        'codigo',
        'anio',
        'periodo',
        'estado',
        'fecha_inicio',
        'fecha_fin',
        'es_actual',
    ];

    protected $casts = [
        'anio' => 'integer',
        'periodo' => 'integer',
        'fecha_inicio' => 'date',
        'fecha_fin' => 'date',
        'es_actual' => 'boolean',
    ];

    /**
     * Postulantes registrados en esta gestión.
     */
    public function postulantes(): HasMany
    {
        return $this->hasMany(Postulante::class);
    }

    /**
     * Pagos realizados en esta gestión.
     */
    public function pagos(): HasMany
    {
        return $this->hasMany(Pago::class);
    }

    /**
     * Devuelve la gestión actualmente activa (es_actual = true), o null.
     * Atajo de uso frecuente en controladores y servicios.
     */
    public static function actual(): ?self
    {
        return static::where('es_actual', true)->first();
    }
}
