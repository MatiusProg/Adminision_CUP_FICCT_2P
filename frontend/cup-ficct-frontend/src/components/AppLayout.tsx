// Layout principal de las páginas autenticadas. Maneja el estado colapsado del
// sidebar, lo pasa al header, y aplica una transición sutil de entrada al contenido.

import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { AppHeader } from "@/components/AppHeader";
import { Sidebar } from "@/components/Sidebar";
import { cn } from "@/lib/utils";

export function AppLayout() {
  // Estado del sidebar (colapsado a íconos o expandido). Solo aplica en escritorio.
  const [collapsed, setCollapsed] = useState(false);
  // La key de la ubicación reinicia la animación de entrada al cambiar de ruta.
  const location = useLocation();

  return (
    <div className="flex h-screen flex-col">
      <AppHeader collapsed={collapsed} onToggleCollapse={() => setCollapsed((c) => !c)} />
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar fijo en escritorio, con ancho según colapso */}
        <aside
          className={cn(
            "hidden shrink-0 border-r transition-[width] duration-300 ease-in-out md:block",
            collapsed ? "w-[72px]" : "w-64"
          )}
        >
          <Sidebar collapsed={collapsed} />
        </aside>

        {/* Contenido con transición de entrada al navegar */}
        <main className="flex-1 overflow-y-auto bg-background">
          <div
            key={location.pathname}
            className="animate-in fade-in slide-in-from-bottom-2 p-6 duration-300"
          >
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
