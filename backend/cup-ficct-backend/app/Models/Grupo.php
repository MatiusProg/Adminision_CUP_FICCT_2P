<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Grupo de estudio por materia por gestión.
 * Se genera automáticamente con CEIL(total_postulantes / max_alumnos_por_grupo).
 * El docente se asigna después de la generación (UC-15).
 */
class Grupo extends Model
{
    protected $fillable = [
        'gestion_id',
        'materia_id',
        'docente_id',
        'nombre',
        'aula',
        'horario',
        'capacidad',
    ];

    /** Gestión a la que pertenece el grupo. */
    public function gestion(): BelongsTo
    {
        return $this->belongsTo(Gestion::class);
    }

    /** Materia que se dicta en este grupo. */
    public function materia(): BelongsTo
    {
        return $this->belongsTo(Materia::class);
    }

    /** Docente asignado al grupo (puede ser null). */
    public function docente(): BelongsTo
    {
        return $this->belongsTo(Docente::class);
    }

    /** Inscripciones de postulantes a este grupo. */
    public function inscripciones(): HasMany
    {
        return $this->hasMany(Inscripcion::class);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    /** Cantidad de postulantes inscritos en este grupo. */
    public function totalInscritos(): int
    {
        return $this->inscripciones()->count();
    }

    /** Indica si el grupo todavía tiene capacidad disponible. */
    public function tieneCapacidad(): bool
    {
        return $this->totalInscritos() < $this->capacidad;
    }
}