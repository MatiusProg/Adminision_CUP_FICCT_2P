<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

/**
 * Modelo User — usuario del sistema. Todos los roles (incluido postulante)
 * autentican con email + password vía Sanctum. El usuario del postulante se
 * crea junto con el postulante tras el pago exitoso.
 */
class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    protected $fillable = [
        'name',
        'email',
        'password',
        'rol',
        'activo',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected $casts = [
        'email_verified_at' => 'datetime',
        'password' => 'hashed',
        'activo' => 'boolean',
    ];

    /**
     * Postulante asociado a este usuario (si el usuario es un postulante).
     */
    public function postulante(): HasOne
    {
        return $this->hasOne(Postulante::class);
    }

    /** Perfil de docente asociado a este usuario (si tiene rol docente). */
    public function docente(): \Illuminate\Database\Eloquent\Relations\HasOne
    {
        return $this->hasOne(Docente::class);
    }

    /** Solo usuarios activos (no desactivados). */
    public function scopeActivos($query)
    {
        return $query->whereRaw('"activo" = TRUE');
    }
}
