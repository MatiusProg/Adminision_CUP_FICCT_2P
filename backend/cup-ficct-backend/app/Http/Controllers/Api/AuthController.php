<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\UserResource;
use App\Services\AuditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\ValidationException;

/**
 * Controlador de autenticación basado en Laravel Sanctum (tokens para SPA).
 * Cubre el caso de uso UC-01 (iniciar/cerrar sesión) para todos los roles.
 */
class AuthController extends Controller
{
    public function __construct(private AuditService $audit)
    {
    }

    /**
     * Autentica al usuario por correo + contraseña y devuelve un token de acceso.
     * Mensaje de error genérico para no revelar cuál de los dos campos falló (E1).
     */
    public function login(Request $request): JsonResponse
    {
        // Validación de entrada con mensajes en español (E3).
        $credentials = $request->validate([
            'email'    => ['required', 'email'],
            'password' => ['required', 'string'],
        ], [
            'email.required'    => 'El correo es obligatorio.',
            'email.email'       => 'El correo no tiene un formato válido.',
            'password.required' => 'La contraseña es obligatoria.',
        ]);

        $user = \App\Models\User::where('email', $credentials['email'])->first();

        // Credenciales inválidas: mismo mensaje aunque falle email o password (E1).
        if (! $user || ! \Illuminate\Support\Facades\Hash::check($credentials['password'], $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['Correo o contraseña incorrectos.'],
            ]);
        }

        // Verificar que la cuenta esté activa.
        // Mensaje genérico para no revelar si existe la cuenta.
        if (! $user->activo) {
            throw ValidationException::withMessages([
                'email' => ['Su cuenta ha sido desactivada. Contacte al Administrador.'],
            ]);
        }
        
        // Token de acceso Sanctum; el nombre ayuda a identificarlo en la tabla.
        $token = $user->createToken('cup-spa')->plainTextToken;

        // Bitácora de inicio de sesión (acción sensible).
        $this->audit->log('login', 'User', $user->id, null, $request);

        return response()->json([
            'token' => $token,
            'user'  => new UserResource($user),
        ]);
    }

    /**
     * Devuelve el usuario autenticado actual (para rehidratar el contexto en el front).
     */
    public function me(Request $request): UserResource
    {
        return new UserResource($request->user());
    }

    /**
     * Cierra la sesión invalidando únicamente el token usado en esta petición.
     */
    public function logout(Request $request): JsonResponse
    {
        $user = $request->user();
        $request->user()->currentAccessToken()->delete();

        $this->audit->log('logout', 'User', $user->id, null, $request);

        return response()->json(['message' => 'Sesión cerrada correctamente.']);
    }
}
