// Encabezado de la aplicación: botón de menú (móvil + colapsar en escritorio),
// indicador de gestión activa, toggle de tema, datos del usuario y cerrar sesión.

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Menu, LogOut, PanelLeftClose, PanelLeft, CalendarDays } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { gestionesService } from "@/services/gestionesService";
import { Sidebar } from "@/components/Sidebar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";

const rolLabels: Record<string, string> = {
  admin: "Administrador",
  coordinador_academico: "Coordinador Académico",
  docente: "Docente",
  autoridad: "Autoridad",
  postulante: "Postulante",
};

interface AppHeaderProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export function AppHeader({ collapsed, onToggleCollapse }: AppHeaderProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [gestion, setGestion] = useState<string | null>(null);

  // Carga la gestión activa para mostrarla en el header.
  useEffect(() => {
    gestionesService
      .actual()
      .then((res) => setGestion(res.data?.codigo ?? null))
      .catch(() => setGestion(null));
  }, []);

  async function handleLogout() {
    await logout();
    toast.success("Sesión cerrada correctamente.");
    navigate("/login");
  }

  // Inicial del usuario para el avatar.
  const inicial = user?.name?.charAt(0).toUpperCase() ?? "?";

  return (
    <header className="flex h-16 items-center justify-between border-b bg-card px-4">
      <div className="flex items-center gap-2">
        {/* Menú móvil (Sheet) */}
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetTrigger asChild className="md:hidden">
            <Button variant="ghost" size="icon" aria-label="Abrir menú">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 p-0">
            <SheetTitle className="sr-only">Menú de navegación</SheetTitle>
            <Sidebar onNavigate={() => setSheetOpen(false)} />
          </SheetContent>
        </Sheet>

        {/* Botón para colapsar el sidebar (solo escritorio) */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleCollapse}
          aria-label={collapsed ? "Expandir menú" : "Colapsar menú"}
          className="hidden md:inline-flex"
        >
          {collapsed ? <PanelLeft className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
        </Button>

        {/* Indicador de gestión activa */}
        {gestion && (
          <div className="ml-1 hidden items-center gap-2 rounded-full bg-primary/10 px-3 py-1.5 text-sm font-medium text-primary sm:flex">
            <CalendarDays className="h-4 w-4" />
            Gestión {gestion}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        <ThemeToggle />

        {user && (
          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold leading-tight">{user.name}</p>
              <p className="text-xs text-muted-foreground">{rolLabels[user.rol] ?? user.rol}</p>
            </div>
            {/* Avatar con inicial */}
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary font-heading text-sm font-bold text-primary-foreground">
              {inicial}
            </div>
          </div>
        )}

        <Button variant="outline" size="sm" onClick={handleLogout} className="ml-1">
          <LogOut className="mr-2 h-4 w-4" />
          <span className="hidden sm:inline">Salir</span>
        </Button>
      </div>
    </header>
  );
}
