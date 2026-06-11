<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ConfiguracionSistema;
use App\Services\AuditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Configuración de parámetros del sistema (UC-08, solo Administrador).
 * Almacén clave/valor: pesos de exámenes, topes de grupos, monto de inscripción, etc.
 */
class ConfiguracionController extends Controller
{
    public function __construct(private AuditService $audit)
    {
    }

    /**
     * Lista todos los parámetros de configuración.
     */
    public function index(): JsonResponse
    {
        $config = ConfiguracionSistema::orderBy('clave')->get(['id', 'clave', 'valor', 'descripcion']);

        return response()->json(['data' => $config]);
    }

    /**
     * Actualiza el valor de un parámetro identificado por su clave.
     * Ruta: PUT /api/configuracion/{clave}
     */
    public function update(Request $request, string $clave): JsonResponse
    {
        // Claves de solo lectura: los pesos son fijos y no se pueden cambiar desde la UI.
        $clavesProtegidas = ['peso_examen_1', 'peso_examen_2', 'peso_examen_3'];
        if (in_array($clave, $clavesProtegidas)) {
            return response()->json([
                'message' => 'Este parámetro es de solo lectura y no puede modificarse.'
            ], 403);
        }
        
        $data = $request->validate([
            'valor' => ['required', 'string', 'max:255'],
        ], [
            'valor.required' => 'El valor del parámetro es obligatorio.',
        ]);

        $config = ConfiguracionSistema::where('clave', $clave)->first();
        if (! $config) {
            return response()->json(['message' => 'El parámetro de configuración no existe.'], 404);
        }

        $valorAnterior = $config->valor;
        $config->update(['valor' => $data['valor']]);

        $this->audit->log('editar', 'ConfiguracionSistema', $config->id, [
            'clave'   => $clave,
            'antes'   => $valorAnterior,
            'despues' => $data['valor'],
        ], $request);

        return response()->json(['data' => $config]);
    }
}
