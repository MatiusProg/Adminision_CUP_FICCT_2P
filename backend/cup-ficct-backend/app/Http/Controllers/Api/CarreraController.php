<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreCarreraRequest;
use App\Http\Requests\UpdateCarreraRequest;
use App\Http\Resources\CarreraResource;
use App\Models\Carrera;
use App\Services\AuditService;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

/**
 * Gestión del catálogo de carreras de la FICCT (UC-10).
 * Lectura abierta a roles autenticados; escritura solo Administrador (vía ruta).
 */
class CarreraController extends Controller
{
    public function __construct(private AuditService $audit)
    {
    }

    /**
     * Lista las 4 carreras del catálogo (sin paginación; son pocas y fijas).
     */
    public function index(): AnonymousResourceCollection
    {
        return CarreraResource::collection(Carrera::orderBy('nombre')->get());
    }

    /**
     * Muestra una carrera puntual.
     */
    public function show(Carrera $carrera): CarreraResource
    {
        return new CarreraResource($carrera);
    }

    /**
     * Crea una nueva carrera (solo Administrador).
     */
    public function store(StoreCarreraRequest $request): CarreraResource
    {
        $carrera = Carrera::create($request->validated());

        // Bitácora: creación de carrera.
        $this->audit->log('crear', 'Carrera', $carrera->id, $carrera->toArray(), $request);

        return new CarreraResource($carrera);
    }

    /**
     * Actualiza una carrera existente (solo Administrador).
     */
    public function update(UpdateCarreraRequest $request, Carrera $carrera): CarreraResource
    {
        // Guardamos los valores previos para la bitácora (antes/después).
        $antes = $carrera->toArray();

        $carrera->update($request->validated());

        $this->audit->log('editar', 'Carrera', $carrera->id, [
            'antes'   => $antes,
            'despues' => $carrera->fresh()->toArray(),
        ], $request);

        return new CarreraResource($carrera);
    }
}
