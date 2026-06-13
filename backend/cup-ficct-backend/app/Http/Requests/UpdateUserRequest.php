<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Validación para editar un usuario interno (UC-02).
 * La contraseña es opcional en edición — solo se actualiza si se envía.
 */
class UpdateUserRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        // Ignorar el propio usuario en la validación unique de email.
        $userId = $this->route('user')?->id;

        return [
            'name'     => ['sometimes', 'required', 'string', 'max:255'],
            'email'    => [
                'sometimes', 'required', 'email', 'max:255',
                Rule::unique('users', 'email')->ignore($userId),
            ],
            // Contraseña opcional en edición — mínimo 8 si se envía.
            'password' => ['nullable', 'string', 'min:8'],
            'rol'      => ['sometimes', 'required', Rule::in(['admin', 'coordinador_academico', 'autoridad', 'docente'])],
        ];
    }

    public function messages(): array
    {
        return [
            'name.required'  => 'El nombre es obligatorio.',
            'email.required' => 'El correo electrónico es obligatorio.',
            'email.email'    => 'El correo no tiene un formato válido.',
            'email.unique'   => 'Ya existe un usuario con ese correo electrónico.',
            'password.min'   => 'La contraseña debe tener al menos 8 caracteres.',
            'rol.in'         => 'El rol seleccionado no es válido.',
        ];
    }
}
