<?php

namespace App\Services;

use App\Models\Auditoria;
use Illuminate\Http\Request;

/**
 * Servicio centralizado de auditoría.
 * Cada controlador que modifica datos llama a log() para dejar rastro de quién,
 * qué, sobre qué entidad y desde qué IP. Resuelve el problema P4 (trazabilidad).
 */
class AuditService
{
    /**
     * Registra una acción en la bitácora.
     *
     * @param string       $accion    Verbo de la acción: 'crear', 'editar', 'eliminar', 'confirmar_pago', 'login'...
     * @param string       $entidad   Nombre de la entidad afectada: 'Postulante', 'Pago', 'Carrera'...
     * @param int|null     $entidadId ID del registro afectado (null si no aplica).
     * @param array|null   $detalle   Datos de contexto (valores antes/después) que se guardan como JSON.
     * @param Request|null $request   Petición actual, para extraer usuario e IP.
     */
    public function log(
        string $accion,
        string $entidad,
        ?int $entidadId = null,
        ?array $detalle = null,
        ?Request $request = null
    ): Auditoria {
        // El usuario y la IP se toman de la petición cuando está disponible.
        $userId = $request?->user()?->id;
        $ip     = $request?->ip();

        return Auditoria::create([
            'user_id'    => $userId,
            'accion'     => $accion,
            'entidad'    => $entidad,
            'entidad_id' => $entidadId,
            'detalle'    => $detalle,
            'ip_address' => $ip,
        ]);
    }
}
