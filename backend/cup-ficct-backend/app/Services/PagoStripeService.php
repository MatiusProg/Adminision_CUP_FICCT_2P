<?php

namespace App\Services;

use App\Models\Gestion;
use App\Models\Pago;
use App\Models\Postulante;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Stripe\Checkout\Session as StripeSession;
use Stripe\Stripe;
use Stripe\Webhook;

/**
 * Servicio de pagos con Stripe (modo de prueba) para la inscripción al CUP.
 *
 * FLUJO (UC-06 + UC-07):
 *  1. createCheckoutSession(): el admin/coordinador llenó el formulario en el front.
 *     Validamos esos datos, creamos un registro de Pago 'pendiente' y una sesión
 *     de Stripe Checkout. Los datos del postulante NO se guardan todavía: viajan
 *     en la metadata de la sesión. Devolvemos la URL para redirigir a Stripe.
 *  2. handleWebhook(): Stripe notifica 'checkout.session.completed'. Recién aquí,
 *     dentro de una transacción, creamos el User + el Postulante (estado 'confirmado')
 *     y marcamos el Pago como 'completado'.
 */
class PagoStripeService
{
    public function __construct(private AuditService $audit)
    {
        // Clave secreta de Stripe desde el .env (modo prueba).
        Stripe::setApiKey(config('services.stripe.secret'));
    }

    /**
     * Crea la sesión de Stripe Checkout y el registro de Pago 'pendiente'.
     * Los datos del postulante (ya validados por StorePostulanteRequest) se
     * guardan en la metadata de la sesión para recuperarlos en el webhook.
     *
     * @param array $datosPostulante Datos validados del formulario.
     * @return array{checkout_url:string, pago_id:int}
     */
    public function createCheckoutSession(array $datosPostulante): array
    {
        $gestion = Gestion::actual();
        if (! $gestion) {
            throw new \RuntimeException('No hay una gestión activa para registrar el pago.');
        }
        // La gestión debe permitir inscripciones (feature gating por estado).
        if ($gestion->estado !== 'inscripciones_abiertas') {
            throw new \RuntimeException('Las inscripciones no están abiertas en la gestión actual.');
        }

        // Monto de inscripción: parámetro configurable, con respaldo por defecto.
        $monto = (float) (\App\Models\ConfiguracionSistema::obtener('monto_inscripcion') ?? 250);

        // Registro de pago en estado 'pendiente' (aún sin postulante asociado).
        $pago = Pago::create([
            'gestion_id'    => $gestion->id,
            'postulante_id' => null,
            'monto'         => $monto,
            'moneda'        => 'BOB',
            'estado'        => 'pendiente',
            'metodo'        => 'stripe',
        ]);

        // La metadata viaja a Stripe y vuelve en el webhook. Stripe limita el tamaño,
        // por eso guardamos los datos del postulante serializados en una sola clave.
        $session = StripeSession::create([
            'mode'                 => 'payment',
            'payment_method_types' => ['card'],
            'line_items'           => [[
                'price_data' => [
                    'currency'     => 'bob',
                    'product_data' => ['name' => 'Inscripción CUP-FICCT ' . $gestion->codigo],
                    // Stripe maneja montos en la unidad mínima (centavos).
                    'unit_amount'  => (int) round($monto * 100),
                ],
                'quantity' => 1,
            ]],
            'success_url' => config('app.frontend_url') . '/pago/exito?session_id={CHECKOUT_SESSION_ID}',
            'cancel_url'  => config('app.frontend_url') . '/pago/cancelado',
            'metadata'    => [
                'pago_id'    => (string) $pago->id,
                'gestion_id' => (string) $gestion->id,
                'postulante' => json_encode($datosPostulante),
            ],
        ]);

        // Guardamos el session_id para conciliar cuando llegue el webhook.
        $pago->update(['stripe_session_id' => $session->id]);

        return [
            'checkout_url' => $session->url,
            'pago_id'      => $pago->id,
        ];
    }

    /**
     * Procesa el webhook de Stripe. Verifica la firma y, si el pago se completó,
     * crea el usuario + postulante y marca el pago como completado.
     *
     * @param string $payload   Cuerpo crudo de la petición.
     * @param string $sigHeader Encabezado 'Stripe-Signature'.
     */
    public function handleWebhook(string $payload, string $sigHeader): void
    {
        // Verificación de firma: garantiza que el evento vino de Stripe.
        $event = Webhook::constructEvent(
            $payload,
            $sigHeader,
            config('services.stripe.webhook_secret')
        );

        // Solo nos interesa el pago completado en el Ciclo 1.
        if ($event->type !== 'checkout.session.completed') {
            return;
        }

        $session    = $event->data->object;
        $metadata   = $session->metadata;
        $pagoId     = (int) ($metadata->pago_id ?? 0);
        $gestionId  = (int) ($metadata->gestion_id ?? 0);
        $datos      = json_decode($metadata->postulante ?? '{}', true);

        $pago = Pago::find($pagoId);
        if (! $pago) {
            Log::warning("Webhook Stripe: pago {$pagoId} no encontrado.");
            return;
        }

        // --- Idempotencia (Mejora 1) ---
        // Stripe reenvía el mismo evento ante timeouts. Dos defensas:
        // (a) si el pago ya está completado, no repetimos;
        // (b) si ya registramos este event->id exacto, salimos sin hacer nada.
        if ($pago->estado === 'completado') {
            return;
        }
        if ($pago->stripe_event_id === $event->id) {
            return;
        }

        // --- Transacción con manejo de fallo (Mejoras 1 y 3) ---
        // Si algo revienta (p. ej. email duplicado en users), la transacción hace
        // rollback completo: NO queda ni user ni postulante a medias. El pago se
        // mantiene 'pendiente' para poder reconciliarlo, y se deja rastro del conflicto.
        try {
            DB::transaction(function () use ($pago, $gestionId, $datos, $session, $event) {
                // 1. Usuario del postulante (rol 'postulante'). Contraseña temporal aleatoria.
                $user = User::create([
                    'name'     => trim(($datos['nombres'] ?? '') . ' ' . ($datos['apellidos'] ?? '')),
                    'email'    => $datos['email'] ?? ($datos['ci'] . '@cup.local'),
                    'password' => Hash::make(Str::random(16)),
                    'rol'      => 'postulante',
                ]);

                // 2. Postulante en estado 'confirmado' (ya pagó; no existe pendiente_pago).
                $postulante = Postulante::create([
                    'gestion_id'            => $gestionId,
                    'user_id'               => $user->id,
                    'carrera_1ra_opcion_id' => $datos['carrera_1ra_opcion_id'],
                    'carrera_2da_opcion_id' => $datos['carrera_2da_opcion_id'],
                    'ci'                    => $datos['ci'],
                    'nombres'               => $datos['nombres'],
                    'apellidos'             => $datos['apellidos'],
                    'fecha_nacimiento'      => $datos['fecha_nacimiento'],
                    'sexo'                  => $datos['sexo'],
                    'direccion'             => $datos['direccion'] ?? null,
                    'telefono'              => $datos['telefono'] ?? null,
                    'email'                 => $datos['email'] ?? null,
                    'colegio'               => $datos['colegio'] ?? null,
                    'ciudad'                => $datos['ciudad'] ?? null,
                    'titulo_bachiller'      => (bool) ($datos['titulo_bachiller'] ?? false),
                    'estado'                => 'confirmado',
                ]);

                // 3. Pago completado, enlazado al postulante y sellado con el event->id.
                $pago->update([
                    'postulante_id'    => $postulante->id,
                    'estado'           => 'completado',
                    'fecha_pago'       => now(),
                    'stripe_event_id'  => $event->id,
                ]);

                // Bitácora: confirmación de pago (acción del sistema, sin request).
                $this->audit->log('confirmar_pago', 'Pago', $pago->id, [
                    'postulante_id'     => $postulante->id,
                    'stripe_session_id' => $session->id,
                ]);
            });
        } catch (\Throwable $e) {
            // El rollback ya ocurrió. Marcamos el pago como 'fallido' para reconciliación
            // manual y registramos el conflicto (p. ej. email ya existente) en la bitácora.
            $pago->update(['estado' => 'fallido']);

            $this->audit->log('pago_conflicto', 'Pago', $pago->id, [
                'motivo'            => $e->getMessage(),
                'ci'               => $datos['ci'] ?? null,
                'email'            => $datos['email'] ?? null,
                'stripe_session_id' => $session->id,
                'stripe_event_id'   => $event->id,
            ]);

            Log::error("Webhook Stripe: fallo al crear postulante del pago {$pago->id}: {$e->getMessage()}");

            // No relanzamos: respondemos 200 a Stripe para que no reintente
            // indefinidamente un caso que requiere intervención humana.
        }
    }
}
