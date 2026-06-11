<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Examen del CUP-FICCT.
 * Cada gestión tiene 12 exámenes: 3 por cada una de las 4 materias.
 * El número (1, 2 o 3) determina el peso al calcular promedios:
 *   1 → peso_examen_1 (30), 2 → peso_examen_2 (30), 3 → peso_examen_3 (40).
 * Los pesos viven en configuracion_sistema, no en esta tabla.
 */
class Examen extends Model
{
    // Laravel pluraliza 'Examen' como 'examens'; la tabla real es 'examenes'.
    protected $table = 'examenes';

    protected $fillable = [
        'gestion_id',
        'materia_id',
        'numero',
    ];

    protected $casts = [
        'numero' => 'integer',
    ];

    /** Gestión a la que pertenece este examen. */
    public function gestion(): BelongsTo
    {
        return $this->belongsTo(Gestion::class);
    }

    /** Materia a la que corresponde este examen. */
    public function materia(): BelongsTo
    {
        return $this->belongsTo(Materia::class);
    }

    /** Notas de los postulantes en este examen. */
    public function notas(): HasMany
    {
        return $this->hasMany(Nota::class);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    /**
     * Devuelve el peso (porcentaje) de este examen leyendo configuracion_sistema.
     * Ej: examen número 1 → lee 'peso_examen_1' → devuelve 30.
     */
    public function peso(): float
    {
        return (float) ConfiguracionSistema::obtener("peso_examen_{$this->numero}", 33.33);
    }
}