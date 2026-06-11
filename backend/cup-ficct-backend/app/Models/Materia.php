<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Materia del CUP-FICCT.
 * Catálogo fijo de 4 materias: Computación, Matemáticas, Inglés, Física.
 * No cambia entre gestiones — es un catálogo global igual que carreras.
 */
class Materia extends Model
{
    protected $fillable = [
        'nombre',
        'codigo',
    ];

    /** Grupos de esta materia (en todas las gestiones). */
    public function grupos(): HasMany
    {
        return $this->hasMany(Grupo::class);
    }

    /** Exámenes de esta materia (en todas las gestiones). */
    public function examenes(): HasMany
    {
        return $this->hasMany(Examen::class);
    }
}