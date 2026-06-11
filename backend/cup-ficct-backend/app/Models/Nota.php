<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Calificación de un postulante en un examen.
 * Una fila por (postulante, examen). 12 filas por postulante por gestión.
 *
 * Fórmula de promedio por materia (calculada en CalculoNotasService):
 *   promedio = (nota_examen1 × 30 + nota_examen2 × 30 + nota_examen3 × 40) / 100
 *
 * El gestion_id se incluye directamente para simplificar consultas de reportes.
 */
class Nota extends Model
{
    protected $fillable = [
        'gestion_id',
        'postulante_id',
        'examen_id',
        'calificacion',
    ];

    protected $casts = [
        'calificacion' => 'decimal:2',
    ];

    /** Gestión a la que pertenece esta nota. */
    public function gestion(): BelongsTo
    {
        return $this->belongsTo(Gestion::class);
    }

    /** Postulante al que pertenece esta nota. */
    public function postulante(): BelongsTo
    {
        return $this->belongsTo(Postulante::class);
    }

    /** Examen al que corresponde esta nota. */
    public function examen(): BelongsTo
    {
        return $this->belongsTo(Examen::class);
    }
}