<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Entidad central: persona inscrita al CUP en una gestión.
 * Se crea ÚNICAMENTE tras un pago exitoso (ver PagoStripeService).
 */
class Postulante extends Model
{
    protected $fillable = [
        'gestion_id',
        'user_id',
        'carrera_1ra_opcion_id',
        'carrera_2da_opcion_id',
        'ci',
        'nombres',
        'apellidos',
        'fecha_nacimiento',
        'sexo',
        'direccion',
        'telefono',
        'email',
        'colegio',
        'ciudad',
        'titulo_bachiller',
        'estado',
    ];

    protected $casts = [
        'fecha_nacimiento' => 'date',
        'titulo_bachiller' => 'boolean',
    ];

    /** Gestión (período) a la que pertenece el postulante. */
    public function gestion(): BelongsTo
    {
        return $this->belongsTo(Gestion::class);
    }

    /** Usuario del sistema enlazado al postulante (creado tras el pago). */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /** Carrera de primera opción. */
    public function carreraPrimeraOpcion(): BelongsTo
    {
        return $this->belongsTo(Carrera::class, 'carrera_1ra_opcion_id');
    }

    /** Carrera de segunda opción. */
    public function carreraSegundaOpcion(): BelongsTo
    {
        return $this->belongsTo(Carrera::class, 'carrera_2da_opcion_id');
    }

    /** Pagos asociados al postulante. */
    public function pagos(): HasMany
    {
        return $this->hasMany(Pago::class);
    }

    /** Inscripciones a grupos de este postulante. */
    public function inscripciones(): \Illuminate\Database\Eloquent\Relations\HasMany
    {
        return $this->hasMany(Inscripcion::class);
    }

    /** Notas de este postulante en todos los exámenes. */
    public function notas(): \Illuminate\Database\Eloquent\Relations\HasMany
    {
        return $this->hasMany(Nota::class);
    }

    /** Resultado de asignación de cupo de este postulante. */
    public function cupoAsignado(): \Illuminate\Database\Eloquent\Relations\HasOne
    {
        return $this->hasOne(CupoAsignado::class);
    }
}
