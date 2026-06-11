// Página placeholder para módulos pendientes de implementación.
// Se muestra mientras el CU correspondiente no está construido.

import { Construction } from "lucide-react";

interface PlaceholderPageProps {
  title: string;
  description?: string;
}

export function PlaceholderPage({ title, description }: PlaceholderPageProps) {
  return (
    <div className="flex h-[60vh] items-center justify-center">
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
          <Construction className="h-8 w-8 text-muted-foreground" />
        </div>
        <h1 className="font-heading text-xl font-bold">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {description ?? "Este módulo está en construcción y estará disponible próximamente."}
        </p>
      </div>
    </div>
  );
}
