<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Validación para actualizar una carrera (UC-10, solo Administrador).
 * El código sigue siendo único, pero se ignora la propia carrera al validar.
 */
class UpdateCarreraRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        // El parámetro de ruta se llama {carrera} (route model binding o id).
        $carreraId = $this->route('carrera');

        return [
            'nombre'      => ['sometimes', 'required', 'string', 'max:255'],
            'codigo'      => ['sometimes', 'required', 'string', 'max:10', Rule::unique('carreras', 'codigo')->ignore($carreraId)],
            'cupo_maximo' => ['sometimes', 'required', 'integer', 'min:1'],
        ];
    }

    public function messages(): array
    {
        return [
            'nombre.required'      => 'El nombre de la carrera es obligatorio.',
            'codigo.required'      => 'El código de la carrera es obligatorio.',
            'codigo.unique'        => 'Ya existe otra carrera con ese código.',
            'cupo_maximo.min'      => 'El cupo máximo debe ser al menos 1.',
        ];
    }
}
