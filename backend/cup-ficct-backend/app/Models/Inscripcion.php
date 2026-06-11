<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Inscripción de un postulante a un grupo.
 * Cada postulante tiene exactamente 4 inscripciones por gestión (una por materia).
 * El gestion_id se incluye directamente para simplificar consultas de reportes.
 */
class Inscripcion extends Model
{
    // Laravel pluraliza 'Inscripcion' como 'inscripcions' (inglés).
    // Forzamos el nombre real de la tabla en español.
    protected $table = 'inscripciones';

    protected $fillable = [
        'gestion_id',
        'postulante_id',
        'grupo_id',
        'fecha_inscripcion',
    ];

    protected $casts = [
        'fecha_inscripcion' => 'datetime',
    ];

    /** Gestión a la que pertenece esta inscripción. */
    public function gestion(): BelongsTo
    {
        return $this->belongsTo(Gestion::class);
    }

    /** Postulante inscrito. */
    public function postulante(): BelongsTo
    {
        return $this->belongsTo(Postulante::class);
    }

    /** Grupo al que se inscribió el postulante. */
    public function grupo(): BelongsTo
    {
        return $this->belongsTo(Grupo::class);
    }
}