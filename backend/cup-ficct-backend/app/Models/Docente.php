<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Docente del CUP-FICCT.
 * Persiste entre gestiones — no lleva gestion_id.
 * Puede o no tener cuenta de usuario asociada (user_id nullable).
 * La desactivación es lógica (campo activo), no física.
 */
class Docente extends Model
{
    protected $fillable = [
        'ci',
        'nombres',
        'apellidos',
        'email',
        'telefono',
        'titulo',
        'grado_academico',
        'diplomado_docencia',
        'user_id',
        'activo',
    ];

    protected $casts = [
        'diplomado_docencia' => 'boolean',
        'activo'             => 'boolean',
    ];

    /** Cuenta de usuario del sistema asociada al docente (opcional). */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /** Grupos asignados a este docente (en todas las gestiones). */
    public function grupos(): HasMany
    {
        return $this->hasMany(Grupo::class);
    }

    // ── Scopes ────────────────────────────────────────────────────────────────

    /** Solo docentes activos. */
    public function scopeActivos($query)
    {
        return $query->whereRaw('"activo" = TRUE');
    }
}