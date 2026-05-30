<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/**
 * Modelo ConfiguracionSistema — almacén clave/valor de parámetros configurables.
 * Global para Ciclo 1 (sin gestion_id). Nunca se hardcodean estos valores.
 */
class ConfiguracionSistema extends Model
{
    use HasFactory;

    // Laravel pluraliza mal; forzamos el nombre real de la tabla.
    protected $table = 'configuracion_sistema';

    protected $fillable = [
        'clave',
        'valor',
        'descripcion',
    ];

    /**
     * Lee el valor de un parámetro por su clave, con valor por defecto opcional.
     */
    public static function obtener(string $clave, mixed $defecto = null): mixed
    {
        return static::where('clave', $clave)->value('valor') ?? $defecto;
    }
}
