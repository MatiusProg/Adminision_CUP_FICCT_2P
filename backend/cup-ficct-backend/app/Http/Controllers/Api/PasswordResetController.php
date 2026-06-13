<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Auth\Events\PasswordReset;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;

/**
 * Recuperación de contraseña (UC-22).
 *
 * Usa el sistema nativo de Laravel Password Reset con Resend como mailer.
 * Solo aplica a usuarios internos (rol != 'postulante').
 * Los postulantes usan su CI como contraseña fija — no necesitan reset.
 *
 * Flujo:
 *   1. POST /api/auth/forgot-password  → envía email con link de reset
 *   2. POST /api/auth/reset-password   → valida token y actualiza contraseña
 */
class PasswordResetController extends Controller
{
    /**
     * Envía el email de recuperación de contraseña.
     * Ruta: POST /api/auth/forgot-password (pública)
     *
     * Responde siempre con 200 aunque el email no exista — evita
     * enumerar usuarios válidos del sistema (seguridad por diseño).
     */
    public function forgotPassword(Request $request): JsonResponse
    {
        $request->validate([
            'email' => ['required', 'email'],
        ], [
            'email.required' => 'El correo electrónico es obligatorio.',
            'email.email'    => 'El correo no tiene un formato válido.',
        ]);

        // Verificar que el email pertenece a un usuario interno (no postulante).
        // Si el usuario no existe o es postulante, respondemos igual para no revelar info.
        $user = User::where('email', $request->email)
            ->where('rol', '!=', 'postulante')
            ->whereRaw('"activo" = TRUE')
            ->first();

        if ($user) {
            // Enviar el link de reset solo si el usuario es interno y activo.
            Password::sendResetLink(['email' => $request->email]);
        }

        // Respuesta genérica siempre — no revelar si el email existe o no.
        return response()->json([
            'message' => 'Si el correo está registrado en el sistema, recibirá un enlace para restablecer su contraseña.',
        ]);
    }

    /**
     * Restablece la contraseña con el token recibido por email.
     * Ruta: POST /api/auth/reset-password (pública)
     */
    public function resetPassword(Request $request): JsonResponse
    {
        $request->validate([
            'token'    => ['required', 'string'],
            'email'    => ['required', 'email'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
        ], [
            'token.required'     => 'El token de recuperación es obligatorio.',
            'email.required'     => 'El correo electrónico es obligatorio.',
            'email.email'        => 'El correo no tiene un formato válido.',
            'password.required'  => 'La nueva contraseña es obligatoria.',
            'password.min'       => 'La contraseña debe tener al menos 8 caracteres.',
            'password.confirmed' => 'Las contraseñas no coinciden.',
        ]);

        // Verificar que no es un postulante antes de procesar el reset.
        $user = User::where('email', $request->email)
            ->where('rol', '!=', 'postulante')
            ->first();

        if (! $user) {
            return response()->json([
                'message' => 'No se encontró una cuenta interna con ese correo.',
            ], 422);
        }

        // Laravel verifica el token, actualiza la contraseña y limpia el registro.
        $status = Password::reset(
            $request->only('email', 'password', 'password_confirmation', 'token'),
            function (User $user, string $password) {
                $user->forceFill([
                    'password'       => Hash::make($password),
                    'remember_token' => Str::random(60),
                ])->save();

                // Invalidar todos los tokens Sanctum activos del usuario
                // para forzar re-login con la nueva contraseña.
                $user->tokens()->delete();

                event(new PasswordReset($user));
            }
        );

        // Respuesta según el resultado del reset.
        if ($status === Password::PASSWORD_RESET) {
            return response()->json([
                'message' => 'Contraseña restablecida correctamente. Puede iniciar sesión con su nueva contraseña.',
            ]);
        }

        // Token inválido o expirado.
        return response()->json([
            'message' => match ($status) {
                Password::INVALID_TOKEN => 'El enlace de recuperación ha expirado o no es válido. Solicite uno nuevo.',
                Password::INVALID_USER  => 'No se encontró una cuenta con ese correo.',
                default                 => 'No se pudo restablecer la contraseña. Intente nuevamente.',
            },
        ], 422);
    }
}
