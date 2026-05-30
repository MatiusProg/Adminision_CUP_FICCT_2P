// Layout principal de las páginas autenticadas: header arriba, sidebar fijo
// en escritorio y el contenido de la ruta en el centro.

import { Outlet } from "react-router-dom";
import { AppHeader } from "@/components/AppHeader";
import { Sidebar } from "@/components/Sidebar";

export function AppLayout() {
  return (
    <div className="flex h-screen flex-col">
      <AppHeader />
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar fijo solo en escritorio */}
        <aside className="hidden w-64 border-r bg-card md:block">
          <Sidebar />
        </aside>
        <main className="flex-1 overflow-y-auto bg-background p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
