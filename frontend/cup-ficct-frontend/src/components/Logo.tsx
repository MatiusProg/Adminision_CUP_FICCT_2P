// Logo institucional reutilizable. Muestra el escudo de la FICCT con un
// resplandor cian sutil detrás, para que destaque sobre fondos claros u oscuros.
// El escudo debe estar en: src/assets/escudo-ficct.png

import escudo from "@/assets/escudo-ficct.png";
import { cn } from "@/lib/utils";

interface LogoProps {
  // Tamaño en píxeles del escudo (alto y ancho proporcional).
  size?: number;
  // Si se muestra el resplandor cian detrás.
  glow?: boolean;
  className?: string;
}

export function Logo({ size = 64, glow = true, className }: LogoProps) {
  return (
    <div className={cn("relative inline-flex items-center justify-center", className)}>
      {glow && (
        <div
          className="absolute inset-0 rounded-full blur-2xl opacity-40"
          style={{
            background:
              "radial-gradient(circle, oklch(0.7 0.13 195 / 0.6), transparent 70%)",
          }}
          aria-hidden
        />
      )}
      <img
        src={escudo}
        alt="Escudo FICCT - UAGRM"
        width={size}
        height={size}
        className="relative object-contain drop-shadow-lg"
        style={{ width: size, height: "auto" }}
      />
    </div>
  );
}
