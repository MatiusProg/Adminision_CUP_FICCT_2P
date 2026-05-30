// Páginas de retorno de Stripe Checkout: éxito y cancelación.
// El postulante real se crea por webhook; aquí solo informamos al usuario.

import { useNavigate } from "react-router-dom";
import { CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PagoExitoPage() {
  const navigate = useNavigate();
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted px-4">
      <div className="w-full max-w-md rounded-3xl bg-card p-8 text-center shadow-card">
        <CheckCircle2 className="mx-auto mb-4 h-14 w-14 text-green-600" />
        <h1 className="mb-2 text-xl font-bold">Pago realizado con éxito</h1>
        <p className="mb-6 text-sm text-muted-foreground">
          La inscripción del postulante quedó confirmada. El registro puede tardar unos
          segundos en reflejarse mientras se procesa la confirmación del pago.
        </p>
        <Button onClick={() => navigate("/postulantes")}>Ir a postulantes</Button>
      </div>
    </div>
  );
}

export function PagoCanceladoPage() {
  const navigate = useNavigate();
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted px-4">
      <div className="w-full max-w-md rounded-3xl bg-card p-8 text-center shadow-card">
        <XCircle className="mx-auto mb-4 h-14 w-14 text-destructive" />
        <h1 className="mb-2 text-xl font-bold">Pago cancelado</h1>
        <p className="mb-6 text-sm text-muted-foreground">
          El pago no se completó, por lo que el postulante no fue registrado. Puede
          intentar nuevamente cuando lo desee.
        </p>
        <Button onClick={() => navigate("/postulantes/nuevo")}>Reintentar registro</Button>
      </div>
    </div>
  );
}
