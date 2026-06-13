<?php
// ============================================================
// ARCHIVO 1: app/Http/Requests/StoreDocenteRequest.php
// ============================================================

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Validación para crear un docente (UC-11).
 * El CI es único en la tabla docentes.
 * Si crear_cuenta=true, el email también debe ser único en users.
 */
class StoreDocenteRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'ci'                  => ['required', 'string', 'max:20', 'unique:docentes,ci'],
            'nombres'             => ['required', 'string', 'max:255'],
            'apellidos'           => ['required', 'string', 'max:255'],
            'email'               => ['required', 'email', 'max:255', 'unique:docentes,email'],
            'telefono'            => ['nullable', 'string', 'max:30'],
            'titulo'              => ['nullable', 'string', 'max:255'],
            // Grado académico obligatorio — verifica nivel de formación del docente.
            'grado_academico'     => ['required', Rule::in(['Licenciatura', 'Maestría', 'Doctorado'])],
            // Diplomado en docencia — requisito de habilitación pedagógica.
            'diplomado_docencia'  => ['boolean'],
            // Campos opcionales para crear cuenta de usuario asociada.
            'crear_cuenta'        => ['boolean'],
            'password'            => ['required_if:crear_cuenta,true', 'nullable', 'string', 'min:8'],
        ];
    }

    public function messages(): array
    {
        return [
            'ci.required'              => 'El CI es obligatorio.',
            'ci.unique'                => 'Ya existe un docente con ese CI.',
            'nombres.required'         => 'Los nombres son obligatorios.',
            'apellidos.required'       => 'Los apellidos son obligatorios.',
            'email.required'           => 'El correo electrónico es obligatorio.',
            'email.email'              => 'El correo no tiene un formato válido.',
            'email.unique'             => 'Ya existe un docente con ese correo electrónico.',
            'grado_academico.required' => 'El grado académico es obligatorio.',
            'grado_academico.in'       => 'El grado académico debe ser Licenciatura, Maestría o Doctorado.',
            'password.required_if'     => 'La contraseña es obligatoria cuando se crea una cuenta de acceso.',
            'password.min'             => 'La contraseña debe tener al menos 8 caracteres.',
        ];
    }
}
