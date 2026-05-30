<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Pago de inscripción al CUP (Stripe). Se crea 'pendiente' al iniciar el checkout
 * y pasa a 'completado' en el webhook tras confirmarse el pago.
 */
class Pago extends Model
{
    protected $fillable = [
        'gestion_id',
        'postulante_id',
        'monto',
        'moneda',
        'estado',
        'stripe_session_id',
        'stripe_event_id',   // Mejora 1: idempotencia del webhook
        'metodo',
        'fecha_pago',
    ];

    protected $casts = [
        'monto'      => 'decimal:2',
        'fecha_pago' => 'datetime',
    ];

    /** Gestión (período) a la que pertenece el pago. */
    public function gestion(): BelongsTo
    {
        return $this->belongsTo(Gestion::class);
    }

    /** Postulante asociado (null hasta que el pago se completa). */
    public function postulante(): BelongsTo
    {
        return $this->belongsTo(Postulante::class);
    }
}
