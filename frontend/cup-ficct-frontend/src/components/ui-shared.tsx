// Componentes visuales reutilizables en todas las páginas.

import { cn } from "@/lib/utils";

// ── Badge de estado del postulante ──────────────────────────────────────────
// Cada estado tiene su color semántico: confirmado=cian, aprobado/admitido=verde,
// reprobado/no_admitido=rojo.

const estadoConfig: Record<
  string,
  { label: string; className: string }
> = {
  confirmado: {
    label: "Confirmado",
    className:
      "bg-primary/10 text-primary border border-primary/20",
  },
  aprobado: {
    label: "Aprobado",
    className:
      "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 dark:text-emerald-400",
  },
  reprobado: {
    label: "Reprobado",
    className:
      "bg-destructive/10 text-destructive border border-destructive/20",
  },
  admitido: {
    label: "Admitido",
    className:
      "bg-emerald-600/15 text-emerald-700 border border-emerald-600/25 dark:text-emerald-300",
  },
  no_admitido: {
    label: "No admitido",
    className:
      "bg-destructive/10 text-destructive border border-destructive/20",
  },
};

interface EstadoBadgeProps {
  estado: string;
  className?: string;
}

export function EstadoBadge({ estado, className }: EstadoBadgeProps) {
  const config = estadoConfig[estado] ?? {
    label: estado,
    className: "bg-muted text-muted-foreground border border-border",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        config.className,
        className
      )}
    >
      {config.label}
    </span>
  );
}

// ── Skeleton de carga ────────────────────────────────────────────────────────
// Placeholder animado para mostrar mientras se cargan los datos.

interface SkeletonRowsProps {
  rows?: number;
  cols?: number;
}

export function SkeletonRows({ rows = 5, cols = 5 }: SkeletonRowsProps) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <tr key={i} className="border-b border-border/50">
          {Array.from({ length: cols }).map((_, j) => (
            <td key={j} className="px-4 py-3">
              <div
                className="h-4 animate-pulse rounded-md bg-muted"
                style={{ width: `${60 + ((i + j) % 3) * 15}%`, animationDelay: `${(i * cols + j) * 50}ms` }}
              />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

// ── Estado vacío ─────────────────────────────────────────────────────────────
// Mensaje cuando no hay datos que mostrar.

interface EmptyStateProps {
  message?: string;
  cols?: number;
}

export function EmptyState({ message = "No hay datos registrados.", cols = 5 }: EmptyStateProps) {
  return (
    <tr>
      <td colSpan={cols} className="py-16 text-center">
        <div className="flex flex-col items-center gap-2 text-muted-foreground">
          <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center text-2xl">
            📭
          </div>
          <p className="text-sm">{message}</p>
        </div>
      </td>
    </tr>
  );
}

// ── Encabezado de página ─────────────────────────────────────────────────────
// Título + descripción opcional + acciones a la derecha.

interface PageHeaderProps {
  title: string;
  description?: string;
  children?: React.ReactNode; // botones/acciones
}

export function PageHeader({ title, description, children }: PageHeaderProps) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="font-heading text-2xl font-bold tracking-tight">{title}</h1>
        {description && (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {children && <div className="flex items-center gap-2">{children}</div>}
    </div>
  );
}

// ── Tarjeta de contenido ─────────────────────────────────────────────────────

export function ContentCard({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border bg-card shadow-sm",
        className
      )}
    >
      {children}
    </div>
  );
}
