<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\DashboardService;
use Illuminate\Http\JsonResponse;

/**
 * Panel de control con KPIs (UC-09). Accesible por Administrador y Autoridad.
 */
class DashboardController extends Controller
{
    public function __construct(private DashboardService $dashboard)
    {
    }

    /**
     * Devuelve los indicadores clave de la gestión activa.
     */
    public function kpis(): JsonResponse
    {
        return response()->json(['data' => $this->dashboard->kpis()]);
    }
}
