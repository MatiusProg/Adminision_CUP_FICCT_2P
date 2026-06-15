<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\UpdatePostulanteRequest;
use App\Http\Resources\PostulanteResource;
use App\Models\Gestion;
use App\Models\Postulante;
use App\Services\AuditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PostulanteController extends Controller
{
    public function __construct(private AuditService $audit)
    {
    }

    /**
     * Lista postulantes de la gestión activa con búsqueda, filtro por estado y paginación.
     * Parámetros opcionales: ?search=, ?estado=, ?per_page=.
     */
    public function index(Request $request): JsonResponse
    {
        $gestion = Gestion::actual();

        // Sin gestión activa no hay datos transaccionales que mostrar.
        if (! $gestion) {
            return response()->json([
                'message' => 'No hay una gestión activa configurada.',
                'data'    => [],
            ], 200);
        }

        $query = Postulante::query()
            ->with(['carreraPrimeraOpcion', 'carreraSegundaOpcion'])
            ->where('gestion_id', $gestion->id);

        // Búsqueda por nombre, apellido o CI (UC-04).
        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('nombres', 'ILIKE', "%{$search}%")
                  ->orWhere('apellidos', 'ILIKE', "%{$search}%")
                  ->orWhere('ci', 'ILIKE', "%{$search}%");
            });
        }

        // Filtro por estado (UC-04).
        if ($estado = $request->query('estado')) {
            $query->where('estado', $estado);
        }

        $perPage = (int) $request->query('per_page', 15);
        $postulantes = $query->orderBy('apellidos')->paginate($perPage);

        // paginate() ya entrega la metadata de paginación junto a los datos.
        return PostulanteResource::collection($postulantes)->response();
    }

    /**
     * Muestra un postulante puntual con sus carreras.
     */
    public function show(Postulante $postulante): PostulanteResource
    {
        $postulante->load(['carreraPrimeraOpcion', 'carreraSegundaOpcion']);

        return new PostulanteResource($postulante);
    }

    /**
     * Actualiza los datos de un postulante (UC-05, admin/coordinador).
     */
    public function update(UpdatePostulanteRequest $request, Postulante $postulante): PostulanteResource
    {
        $antes = $postulante->toArray();

        $postulante->update($request->validated());

        $this->audit->log('editar', 'Postulante', $postulante->id, [
            'antes'   => $antes,
            'despues' => $postulante->fresh()->toArray(),
        ], $request);

        $postulante->load(['carreraPrimeraOpcion', 'carreraSegundaOpcion']);

        return new PostulanteResource($postulante);
    }

    /**
     * Elimina físicamente un postulante (UC-05). Borrado lógico queda para Ciclo 2.
     */
    public function destroy(Request $request, Postulante $postulante): JsonResponse
    {
        $datosPrevios = $postulante->toArray();
        
        // Eliminar también el usuario asociado para liberar el email.
        // Sin esto, un re-registro del mismo postulante falla por unique en users.email.
        if ($postulante->user_id) {
            \App\Models\User::destroy($postulante->user_id);
        }
        
        $postulante->delete();

        $this->audit->log('eliminar', 'Postulante', $datosPrevios['id'], $datosPrevios, $request);

        return response()->json(['message' => 'Postulante eliminado correctamente.']);
    }
}
