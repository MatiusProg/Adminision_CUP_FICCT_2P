<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StorePostulanteRequest;
use App\Models\Pago;
use App\Services\PagoStripeService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Controlador de pagos de inscripción vía Stripe (UC-06 / UC-07).
 */
class PagoController extends Controller
{
    public function __construct(private PagoStripeService $stripe)
    {
    }

    /**
     * Inicia el pago: valida el formulario del postulante y crea la sesión de Stripe.
     * Devuelve la URL de Checkout a la que el front debe redirigir.
     * Protegida por rol (admin/coordinador) en la ruta.
     */
    public function createSession(StorePostulanteRequest $request): JsonResponse
    {
        try {
            $resultado = $this->stripe->createCheckoutSession($request->validated());

            return response()->json($resultado, 201);
        } catch (\RuntimeException $e) {
            // Errores de negocio (sin gestión activa, inscripciones cerradas...).
            return response()->json(['message' => $e->getMessage()], 422);
        }
    }

    /**
     * Webhook público de Stripe. NO lleva auth (Stripe no envía token), pero se
     * verifica la firma dentro del servicio. Crea user+postulante si el pago se completó.
     */
    public function webhook(Request $request): JsonResponse
    {
        try {
            $this->stripe->handleWebhook(
                $request->getContent(),
                $request->header('Stripe-Signature', '')
            );

            return response()->json(['received' => true]);
        } catch (\UnexpectedValueException $e) {
            // Payload inválido.
            return response()->json(['message' => 'Payload inválido.'], 400);
        } catch (\Stripe\Exception\SignatureVerificationException $e) {
            // Firma inválida: posible intento de suplantación.
            return response()->json(['message' => 'Firma de webhook inválida.'], 400);
        }
    }

    /**
     * Devuelve los pagos asociados a un postulante (para consulta administrativa).
     */
    public function porPostulante(int $postulanteId): JsonResponse
    {
        $pagos = Pago::where('postulante_id', $postulanteId)
            ->orderByDesc('created_at')
            ->get();

        return response()->json(['data' => $pagos]);
    }
}
