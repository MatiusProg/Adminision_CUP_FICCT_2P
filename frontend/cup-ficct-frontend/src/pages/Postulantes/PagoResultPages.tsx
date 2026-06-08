// Páginas de retorno de Stripe Checkout: éxito y cancelación.
// Rediseñadas con la paleta y el escudo institucional.

import { useNavigate } from "react-router-dom";
import { CheckCircle2, XCircle, ArrowRight, RefreshCw } from "lucide-react";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";

export function PagoExitoPage() {
  const navigate = useNavigate();
  return (
    <div className="bg-ficct-glow flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        {/* Escudo pequeño arriba */}
        <Logo size={56} className="mx-auto mb-8" />

        {/* Ícono de éxito con resplandor */}
        <div className="relative mx-auto mb-6 flex h-20 w-20 items-center justify-center">
          <div className="absolute inset-0 rounded-full bg-emerald-500/20 blur-xl" />
          <div className="relative rounded-full bg-emerald-500/15 p-4">
            <CheckCircle2 className="h-12 w-12 text-emerald-500" />
          </div>
        </div>

        <h1 className="font-heading text-2xl font-bold">Pago realizado con éxito</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          La inscripción del postulante quedó confirmada. El registro puede tardar
          unos segundos en reflejarse mientras se procesa la confirmación del pago.
        </p>

        <Button
          onClick={() => navigate("/postulantes")}
          className="mt-8"
          size="lg"
        >
          Ir a postulantes
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export function PagoCanceladoPage() {
  const navigate = useNavigate();
  return (
    <div className="bg-ficct-glow flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        <Logo size={56} className="mx-auto mb-8" />

        <div className="relative mx-auto mb-6 flex h-20 w-20 items-center justify-center">
          <div className="absolute inset-0 rounded-full bg-destructive/20 blur-xl" />
          <div className="relative rounded-full bg-destructive/15 p-4">
            <XCircle className="h-12 w-12 text-destructive" />
          </div>
        </div>

        <h1 className="font-heading text-2xl font-bold">Pago cancelado</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          El pago no se completó, por lo que el postulante no fue registrado.
          Puede intentar nuevamente cuando lo desee.
        </p>

        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Button
            onClick={() => navigate("/postulantes/nuevo")}
            size="lg"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Reintentar registro
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate("/postulantes")}
            size="lg"
          >
            Ir a postulantes
          </Button>
        </div>
      </div>
    </div>
  );
}
