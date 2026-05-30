<?php

namespace App\Http\Requests;

use App\Models\Postulante;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Validación para editar un postulante existente (UC-05, admin/coordinador).
 * El CI sigue siendo único por gestión, ignorando al propio postulante.
 */
class UpdatePostulanteRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        /** @var Postulante|null $postulante */
        $postulante = $this->route('postulante');
        $gestionId  = $postulante?->gestion_id;

        return [
            'carrera_1ra_opcion_id' => ['sometimes', 'required', 'integer', 'exists:carreras,id'],
            'carrera_2da_opcion_id' => ['sometimes', 'required', 'integer', 'exists:carreras,id', 'different:carrera_1ra_opcion_id'],
            'ci'                    => [
                'sometimes', 'required', 'string', 'max:20',
                Rule::unique('postulantes', 'ci')
                    ->where(fn ($q) => $q->where('gestion_id', $gestionId))
                    ->ignore($postulante?->id),
            ],
            'nombres'          => ['sometimes', 'required', 'string', 'max:255'],
            'apellidos'        => ['sometimes', 'required', 'string', 'max:255'],
            'fecha_nacimiento' => ['sometimes', 'required', 'date', 'before:today'],
            'sexo'             => ['sometimes', 'required', Rule::in(['M', 'F'])],
            'direccion'        => ['nullable', 'string', 'max:255'],
            'telefono'         => ['nullable', 'string', 'max:30'],
            'email'            => ['nullable', 'email', 'max:255'],
            'colegio'          => ['nullable', 'string', 'max:255'],
            'ciudad'           => ['nullable', 'string', 'max:255'],
            'titulo_bachiller' => ['sometimes', 'required', 'boolean'],
            // El estado solo puede moverse entre los valores válidos del Ciclo 1.
            'estado'           => ['sometimes', 'required', Rule::in(['confirmado', 'aprobado', 'reprobado', 'admitido', 'no_admitido'])],
        ];
    }

    public function messages(): array
    {
        return [
            'ci.unique'                       => 'Ya existe otro postulante con ese CI en la gestión actual.',
            'carrera_2da_opcion_id.different' => 'La segunda opción debe ser distinta a la primera.',
            'fecha_nacimiento.before'         => 'La fecha de nacimiento debe ser anterior a hoy.',
            'estado.in'                       => 'El estado del postulante no es válido.',
        ];
    }
}
