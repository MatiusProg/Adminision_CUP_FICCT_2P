<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Validación para crear una gestión (período académico). Solo Administrador.
 * Restricción de la base: UNIQUE(codigo) y UNIQUE(anio, periodo).
 */
class StoreGestionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'codigo'       => ['required', 'string', 'max:20', 'unique:gestiones,codigo'],
            'anio'         => ['required', 'integer', 'min:2020', 'max:2100'],
            'periodo'      => ['required', 'integer', Rule::in([1, 2])],
            'fecha_inicio' => ['nullable', 'date'],
            'fecha_fin'    => ['nullable', 'date', 'after_or_equal:fecha_inicio'],
        ];
    }

    public function messages(): array
    {
        return [
            'codigo.required'  => 'El código de la gestión es obligatorio.',
            'codigo.unique'    => 'Ya existe una gestión con ese código.',
            'anio.required'    => 'El año es obligatorio.',
            'periodo.required' => 'El período es obligatorio.',
            'periodo.in'       => 'El período debe ser 1 o 2.',
            'fecha_fin.after_or_equal' => 'La fecha de fin no puede ser anterior a la de inicio.',
        ];
    }
}
