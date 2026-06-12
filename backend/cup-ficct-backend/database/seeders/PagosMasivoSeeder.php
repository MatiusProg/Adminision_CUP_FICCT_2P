<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use App\Models\Gestion;

/**
 * Crea un pago completado por cada postulante de la carga masiva.
 * Los postulantes sembrados por CargaMasivaSeeder no tienen pagos asociados
 * porque saltaron el flujo de Stripe. Este seeder corrige eso para que
 * el dashboard muestre una recaudación coherente con el volumen de postulantes.
 *
 * Montos por gestión (varían históricamente):
 *   2025-1 → 600 BOB
 *   2025-2 → 600 BOB
 *   2026-1 → 700 BOB
 *   2026-2 → 700 BOB (coincide con configuracion_sistema.monto_inscripcion)
 *
 * Solo crea pagos para postulantes que aún no tienen uno (idempotente).
 */
class PagosMasivoSeeder extends Seeder
{
    // Monto histórico por gestión (código => monto en BOB)
    private array $montos = [
        '2025-1' => 600.00,
        '2025-2' => 600.00,
        '2026-1' => 700.00,
        '2026-2' => 700.00,
    ];

    public function run(): void
    {
        $gestiones = Gestion::all();
        $ahora     = now()->toDateTimeString();
        $total     = 0;

        foreach ($gestiones as $gestion) {
            $monto = $this->montos[$gestion->codigo] ?? 700.00;

            // Obtener postulantes de esta gestión que aún no tienen pago completado
            $postulantesConPago = DB::table('pagos')
                ->where('gestion_id', $gestion->id)
                ->where('estado', 'completado')
                ->whereNotNull('postulante_id')
                ->pluck('postulante_id')
                ->toArray();

            $postulantes = DB::table('postulantes')
                ->where('gestion_id', $gestion->id)
                ->whereNotIn('id', $postulantesConPago)
                ->pluck('id')
                ->toArray();

            if (empty($postulantes)) {
                $this->command->info("ℹ️  Gestión {$gestion->codigo}: todos los postulantes ya tienen pago.");
                continue;
            }

            // Insertar pagos en lotes de 200 para no saturar el pooler
            $pagos = [];
            foreach ($postulantes as $postId) {
                $pagos[] = [
                    'gestion_id'      => $gestion->id,
                    'postulante_id'   => $postId,
                    'monto'           => $monto,
                    'moneda'          => 'BOB',
                    'estado'          => 'completado',
                    'metodo'          => 'stripe',
                    'stripe_session_id' => null,
                    'stripe_event_id'   => null,
                    'fecha_pago'      => $ahora,
                    'created_at'      => $ahora,
                    'updated_at'      => $ahora,
                ];

                if (count($pagos) === 200) {
                    DB::table('pagos')->insert($pagos);
                    $pagos = [];
                }
            }

            if (!empty($pagos)) {
                DB::table('pagos')->insert($pagos);
            }

            $subtotal = count($postulantes) * $monto;
            $this->command->info("✅ Gestión {$gestion->codigo}: " . count($postulantes) . " pagos de {$monto} BOB = " . number_format($subtotal, 2) . " BOB");
            $total += $subtotal;
        }

        $this->command->info("💰 Recaudación total sembrada: " . number_format($total, 2) . " BOB");
    }
}