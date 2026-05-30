<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Modelo Carrera — una de las 4 carreras de la FICCT. Catálogo: persiste entre
 * gestiones, por eso no lleva gestion_id.
 */
class Carrera extends Model
{
    use HasFactory;

    protected $fillable = [
        'nombre',
        'codigo',
        'cupo_maximo',
    ];

    protected $casts = [
        'cupo_maximo' => 'integer',
    ];

    /**
     * Postulantes que eligieron esta carrera como primera opción.
     */
    public function postulantesPrimeraOpcion(): HasMany
    {
        return $this->hasMany(Postulante::class, 'carrera_1ra_opcion_id');
    }

    /**
     * Postulantes que eligieron esta carrera como segunda opción.
     */
    public function postulantesSegundaOpcion(): HasMany
    {
        return $this->hasMany(Postulante::class, 'carrera_2da_opcion_id');
    }
}
