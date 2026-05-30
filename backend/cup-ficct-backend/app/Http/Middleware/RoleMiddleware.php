<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Middleware de control de acceso por rol.
 *
 * Lee directamente la columna `users.rol` (discriminador rápido del Ciclo 1),
 * sin depender de spatie/laravel-permission. Se monta en las rutas con la
 * sintaxis: ->middleware('role:admin,coordinador_academico').
 */
class RoleMiddleware
{
    /**
     * Verifica que el usuario autenticado tenga uno de los roles permitidos.
     * Si no, corta la petición con 403 y un mensaje en español.
     */
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $user = $request->user();

        // Sin usuario autenticado no se evalúan roles (Sanctum ya debió bloquear).
        if (! $user) {
            return response()->json(['message' => 'No autenticado.'], 401);
        }

        // El rol del usuario debe estar dentro de la lista permitida en la ruta.
        if (! in_array($user->rol, $roles, true)) {
            return response()->json([
                'message' => 'No tiene permisos para realizar esta acción.',
            ], 403);
        }

        return $next($request);
    }
}
