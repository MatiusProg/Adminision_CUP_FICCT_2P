<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreGestionRequest;
use App\Models\Gestion;
use App\Services\AuditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

/**
 * Gestión de períodos académicos (gestiones). Solo Administrador para escritura.
 *
 * El campo `estado` avanza en orden y gobierna el feature gating de todo el sistema:
 * inscripciones_abiertas → cup_iniciado → grupos_generados → docentes_asignados
 *  → en_curso → finalizada.
 */
class GestionController extends Controller
{
    // Orden válido de las fases; se usa para impedir saltos hacia atrás.
    private const FASES = [
        'inscripciones_abiertas',
        'cup_iniciado',
        'grupos_generados',
        'docentes_asignados',
        'en_curso',
        'finalizada',
    ];

    public function __construct(private AuditService $audit)
    {
    }

    /**
     * Lista todas las gestiones (incluye históricas), más recientes primero.
     */
    public function index(): JsonResponse
    {
        $gestiones = Gestion::orderByDesc('anio')->orderByDesc('periodo')->get();

        return response()->json(['data' => $gestiones]);
    }

    /**
     * Devuelve la gestión activa (es_actual = true). Usada por casi todo el front.
     */
    public function actual(): JsonResponse
    {
        $gestion = Gestion::actual();

        if (! $gestion) {
            return response()->json(['message' => 'No hay una gestión activa.', 'data' => null], 200);
        }

        return response()->json(['data' => $gestion]);
    }

    /**
     * Crea una nueva gestión. Nace en 'inscripciones_abiertas' y NO activa por defecto.
     */
    public function store(StoreGestionRequest $request): JsonResponse
    {
        $gestion = Gestion::create(array_merge($request->validated(), [
            'estado'   => 'inscripciones_abiertas',
            'es_actual' => false,
        ]));

        $this->audit->log('crear', 'Gestion', $gestion->id, $gestion->toArray(), $request);

        return response()->json(['data' => $gestion], 201);
    }

    /**
     * Cambia el estado (fase) de una gestión, impidiendo retrocesos.
     * Ruta: PUT /api/gestiones/{gestion}/estado
     */
    public function updateEstado(Request $request, Gestion $gestion): JsonResponse
    {
        $data = $request->validate([
            'estado' => ['required', Rule::in(self::FASES)],
        ], [
            'estado.required' => 'El nuevo estado es obligatorio.',
            'estado.in'       => 'El estado indicado no es válido.',
        ]);

        // Validar que el cambio avance o se mantenga, nunca retroceda.
        $indiceActual = array_search($gestion->estado, self::FASES, true);
        $indiceNuevo  = array_search($data['estado'], self::FASES, true);

        if ($indiceNuevo < $indiceActual) {
            return response()->json([
                'message' => 'No se puede retroceder la fase de la gestión.',
            ], 422);
        }

        $estadoAnterior = $gestion->estado;
        $gestion->update(['estado' => $data['estado']]);

        $this->audit->log('cambiar_estado', 'Gestion', $gestion->id, [
            'antes'   => $estadoAnterior,
            'despues' => $data['estado'],
        ], $request);

        return response()->json(['data' => $gestion]);
    }

    /**
     * Activa una gestión, desactivando cualquier otra (solo una es_actual a la vez).
     * Ruta: PUT /api/gestiones/{gestion}/activar
     */
    public function activar(Request $request, Gestion $gestion): JsonResponse
    {
        DB::transaction(function () use ($gestion) {
            // Desactivar la gestión actualmente marcada.
            // Usamos whereRaw + DB::raw para evitar el problema boolean=integer
            // con PDO::ATTR_EMULATE_PREPARES en el pooler de Supabase.
            Gestion::whereRaw('"es_actual" = TRUE')
                ->update(['es_actual' => DB::raw('FALSE')]);
            // Activar la solicitada.
            $gestion->update(['es_actual' => DB::raw('TRUE')]);
        });

        $this->audit->log('activar', 'Gestion', $gestion->id, null, $request);

        return response()->json(['data' => $gestion->fresh()]);
    }
}
