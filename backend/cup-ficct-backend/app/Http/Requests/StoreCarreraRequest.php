<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Validación para crear una carrera (UC-10, solo Administrador).
 * La autorización por rol ya la hace el middleware 'role:admin' en la ruta.
 */
class StoreCarreraRequest extends FormRequest
{
    public function authorize(): bool
    {
        // El control de rol vive en el middleware de la ruta.
        return true;
    }

    public function rules(): array
    {
        return [
            'nombre'      => ['required', 'string', 'max:255'],
            'codigo'      => ['required', 'string', 'max:10', 'unique:carreras,codigo'],
            'cupo_maximo' => ['required', 'integer', 'min:1'],
        ];
    }

    public function messages(): array
    {
        return [
            'nombre.required'      => 'El nombre de la carrera es obligatorio.',
            'codigo.required'      => 'El código de la carrera es obligatorio.',
            'codigo.unique'        => 'Ya existe una carrera con ese código.',
            'cupo_maximo.required' => 'El cupo máximo es obligatorio.',
            'cupo_maximo.min'      => 'El cupo máximo debe ser al menos 1.',
        ];
    }
}
