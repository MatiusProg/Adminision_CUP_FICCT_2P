<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Validación para editar un docente (UC-11).
 */
class UpdateDocenteRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $docenteId = $this->route('docente')?->id;

        return [
            'ci'                 => ['sometimes', 'required', 'string', 'max:20',
                Rule::unique('docentes', 'ci')->ignore($docenteId),
            ],
            'nombres'            => ['sometimes', 'required', 'string', 'max:255'],
            'apellidos'          => ['sometimes', 'required', 'string', 'max:255'],
            'email'              => ['sometimes', 'required', 'email', 'max:255',
                Rule::unique('docentes', 'email')->ignore($docenteId),
            ],
            'telefono'           => ['nullable', 'string', 'max:30'],
            'titulo'             => ['nullable', 'string', 'max:255'],
            'grado_academico'    => ['sometimes', 'required', Rule::in(['Licenciatura', 'Maestría', 'Doctorado'])],
            'diplomado_docencia' => ['sometimes', 'boolean'],
        ];
    }

    public function messages(): array
    {
        return [
            'ci.unique'                => 'Ya existe un docente con ese CI.',
            'email.unique'             => 'Ya existe un docente con ese correo electrónico.',
            'grado_academico.in'       => 'El grado académico debe ser Licenciatura, Maestría o Doctorado.',
        ];
    }
}
