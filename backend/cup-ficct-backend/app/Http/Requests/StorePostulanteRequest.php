<?php

namespace App\Http\Requests;

use App\Models\Gestion;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Validación de los datos del postulante.
 *
 * IMPORTANTE: en el Ciclo 1 el postulante NO se crea desde un endpoint directo.
 * Esta validación se usa al iniciar la sesión de pago (UC-06): se valida el
 * formulario ANTES de redirigir a Stripe, para no enviar datos basura a la
 * pasarela. La creación real ocurre en el webhook tras el pago exitoso (UC-07).
 *
 * Regla clave: el CI es único POR GESTIÓN, no global -> Rule::unique con where.
 */
class StorePostulanteRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        // La unicidad de CI se evalúa contra la gestión activa.
        $gestionActual = Gestion::actual();
        $gestionId     = $gestionActual?->id;

        return [
            'carrera_1ra_opcion_id' => ['required', 'integer', 'exists:carreras,id'],
            'carrera_2da_opcion_id' => ['required', 'integer', 'exists:carreras,id', 'different:carrera_1ra_opcion_id'],
            'ci'                    => [
                'required', 'string', 'max:20',
                Rule::unique('postulantes', 'ci')->where(fn ($q) => $q->where('gestion_id', $gestionId)),
            ],
            'nombres'          => ['required', 'string', 'max:255'],
            'apellidos'        => ['required', 'string', 'max:255'],
            'fecha_nacimiento' => ['required', 'date', 'before:today'],
            'sexo'             => ['required', Rule::in(['M', 'F'])],
            'direccion'        => ['nullable', 'string', 'max:255'],
            'telefono'         => ['nullable', 'string', 'max:30'],
            'email'            => ['nullable', 'email', 'max:255'],
            'colegio'          => ['nullable', 'string', 'max:255'],
            'ciudad'           => ['nullable', 'string', 'max:255'],
            'titulo_bachiller' => ['required', 'boolean'],
        ];
    }

    public function messages(): array
    {
        return [
            'carrera_1ra_opcion_id.required' => 'Debe seleccionar la primera opción de carrera.',
            'carrera_2da_opcion_id.required' => 'Debe seleccionar la segunda opción de carrera.',
            'carrera_2da_opcion_id.different' => 'La segunda opción debe ser distinta a la primera.',
            'ci.required'                    => 'El número de carnet de identidad es obligatorio.',
            'ci.unique'                      => 'Ya existe un postulante con ese CI en la gestión actual.',
            'nombres.required'               => 'Los nombres son obligatorios.',
            'apellidos.required'             => 'Los apellidos son obligatorios.',
            'fecha_nacimiento.required'      => 'La fecha de nacimiento es obligatoria.',
            'fecha_nacimiento.before'        => 'La fecha de nacimiento debe ser anterior a hoy.',
            'sexo.required'                  => 'El sexo es obligatorio.',
            'sexo.in'                        => 'El sexo debe ser M o F.',
            'titulo_bachiller.required'      => 'Debe indicar si cuenta con título de bachiller.',
        ];
    }
}
