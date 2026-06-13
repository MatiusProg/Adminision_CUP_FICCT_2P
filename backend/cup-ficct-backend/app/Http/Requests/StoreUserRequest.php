<?php
// ============================================================
// ARCHIVO 1: app/Http/Requests/StoreUserRequest.php
// ============================================================

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Validación para crear un usuario interno (UC-02).
 * Los roles permitidos excluyen 'postulante' — esos se crean via Stripe.
 */
class StoreUserRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name'     => ['required', 'string', 'max:255'],
            'email'    => ['required', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', 'string', 'min:8'],
            'rol'      => ['required', Rule::in(['admin', 'coordinador_academico', 'autoridad', 'docente'])],
        ];
    }

    public function messages(): array
    {
        return [
            'name.required'     => 'El nombre es obligatorio.',
            'email.required'    => 'El correo electrónico es obligatorio.',
            'email.email'       => 'El correo no tiene un formato válido.',
            'email.unique'      => 'Ya existe un usuario con ese correo electrónico.',
            'password.required' => 'La contraseña es obligatoria.',
            'password.min'      => 'La contraseña debe tener al menos 8 caracteres.',
            'rol.required'      => 'El rol es obligatorio.',
            'rol.in'            => 'El rol seleccionado no es válido.',
        ];
    }
}
