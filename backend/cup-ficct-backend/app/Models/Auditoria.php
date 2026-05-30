<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Bitácora de acciones sensibles (P4 - trazabilidad).
 * Diseño polimórfico por texto: entidad + entidad_id, sin FK a la tabla afectada.
 */
class Auditoria extends Model
{
    // La tabla no maneja updated_at (un registro de bitácora no se modifica).
    public $timestamps = true;

    protected $table = 'auditoria';

    protected $fillable = [
        'user_id',
        'accion',
        'entidad',
        'entidad_id',
        'detalle',
        'ip_address',
    ];

    protected $casts = [
        'detalle' => 'array',
    ];

    /**
     * Usuario que ejecutó la acción (puede ser null en acciones del sistema).
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
