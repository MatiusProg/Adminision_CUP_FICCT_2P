<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Representación de una carrera de la FICCT para la API.
 */
class CarreraResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'          => $this->id,
            'nombre'      => $this->nombre,
            'codigo'      => $this->codigo,
            'cupo_maximo' => $this->cupo_maximo,
        ];
    }
}
