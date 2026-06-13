<?php
// ============================================================
// ARCHIVO 1: app/Http/Resources/DocenteResource.php
// ============================================================

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Representación de un docente para la API (UC-11).
 * Incluye el usuario asociado cuando está precargado.
 */
class DocenteResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'                  => $this->id,
            'ci'                  => $this->ci,
            'nombres'             => $this->nombres,
            'apellidos'           => $this->apellidos,
            'email'               => $this->email,
            'telefono'            => $this->telefono,
            'titulo'              => $this->titulo,
            'grado_academico'     => $this->grado_academico,
            'diplomado_docencia'  => (bool) $this->diplomado_docencia,
            'activo'              => (bool) $this->activo,
            'user_id'             => $this->user_id,
            // Usuario asociado — solo cuando está cargado con with('user').
            'user'                => $this->when(
                $this->relationLoaded('user') && $this->user,
                fn() => [
                    'id'    => $this->user->id,
                    'email' => $this->user->email,
                    'name'  => $this->user->name,
                ]
            ),
        ];
    }
}