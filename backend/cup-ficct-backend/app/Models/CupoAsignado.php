<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Resultado del algoritmo de asignación de cupos por carrera (UC-16).
 * Una fila por postulante aprobado por gestión.
 *
 * Algoritmo:
 *   1. Ordenar postulantes aprobados por promedio_general descendente.
 *   2. Asignar a 1ra opción si hay cupo → opcion_asignada = 'primera'.
 *   3. Si no, asignar a 2da opción si hay cupo → opcion_asignada = 'segunda'.
 *   4. Si no hay cupo en ninguna → opcion_asignada = 'no_admitido', carrera_id = null.
 *   5. Actualizar postulantes.estado según el resultado (admitido / no_admitido).
 */
class CupoAsignado extends Model
{
    // Laravel generaría 'cupo_asignados'; la tabla real es 'cupos_asignados'.
    protected $table = 'cupos_asignados';

    protected $fillable = [
        'gestion_id',
        'postulante_id',
        'carrera_id',
        'promedio_general',
        'posicion_ranking',
        'opcion_asignada',
    ];

    protected $casts = [
        'promedio_general' => 'decimal:2',
        'posicion_ranking' => 'integer',
    ];

    /** Gestión a la que pertenece este resultado. */
    public function gestion(): BelongsTo
    {
        return $this->belongsTo(Gestion::class);
    }

    /** Postulante al que se le asignó (o no) el cupo. */
    public function postulante(): BelongsTo
    {
        return $this->belongsTo(Postulante::class);
    }

    /** Carrera asignada (null si no_admitido). */
    public function carrera(): BelongsTo
    {
        return $this->belongsTo(Carrera::class);
    }

    // ── Scopes ────────────────────────────────────────────────────────────────

    /** Solo postulantes que obtuvieron un cupo (admitidos). */
    public function scopeAdmitidos($query)
    {
        return $query->where('opcion_asignada', '!=', 'no_admitido');
    }

    /** Solo postulantes que no obtuvieron cupo. */
    public function scopeNoAdmitidos($query)
    {
        return $query->where('opcion_asignada', 'no_admitido');
    }
}