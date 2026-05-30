<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Representación de un postulante para la API.
 * Incluye las carreras relacionadas cuando vienen precargadas (whenLoaded).
 */
class PostulanteResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'                => $this->id,
            'gestion_id'        => $this->gestion_id,
            'user_id'           => $this->user_id,
            'ci'                => $this->ci,
            'nombres'           => $this->nombres,
            'apellidos'         => $this->apellidos,
            'fecha_nacimiento'  => $this->fecha_nacimiento,
            'sexo'              => $this->sexo,
            'direccion'         => $this->direccion,
            'telefono'          => $this->telefono,
            'email'             => $this->email,
            'colegio'           => $this->colegio,
            'ciudad'            => $this->ciudad,
            'titulo_bachiller'  => (bool) $this->titulo_bachiller,
            'estado'            => $this->estado,
            'carrera_1ra_opcion_id' => $this->carrera_1ra_opcion_id,
            'carrera_2da_opcion_id' => $this->carrera_2da_opcion_id,
            // Nombres de carrera para mostrar en la tabla sin consultas extra en el front.
            'carrera_1ra_opcion'    => new CarreraResource($this->whenLoaded('carreraPrimeraOpcion')),
            'carrera_2da_opcion'    => new CarreraResource($this->whenLoaded('carreraSegundaOpcion')),
        ];
    }
}
