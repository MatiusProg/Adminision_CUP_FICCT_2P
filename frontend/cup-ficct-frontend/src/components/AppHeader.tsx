// Encabezado de la aplicación: título, menú móvil (Sheet) y botón de cerrar sesión.

import { useNavigate } from "react-router-dom";
import { Menu, LogOut } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { Sidebar } from "@/components/Sidebar";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

// Etiquetas legibles de cada rol para mostrar en el encabezado.
const rolLabels: Record<string, string> = {
  admin: "Administrador",
  coordinador_academico: "Coordinador Académico",
  docente: "Docente",
  autoridad: "Autoridad",
  postulante: "Postulante",
};

export function AppHeader() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    toast.success("Sesión cerrada correctamente.");
    navigate("/login");
  }

  return (
    <header className="flex items-center justify-between border-b bg-card px-4 py-3">
      <div className="flex items-center gap-3">
        {/* Menú lateral en móvil */}
        <Sheet>
          <SheetTrigger asChild className="md:hidden">
            <Button variant="ghost" size="icon" aria-label="Abrir menú">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 p-0">
            <Sidebar />
          </SheetContent>
        </Sheet>

        <span className="text-lg font-semibold">CUP-FICCT</span>
      </div>

      <div className="flex items-center gap-3">
        {user && (
          <div className="hidden text-right sm:block">
            <p className="text-sm font-medium">{user.name}</p>
            <p className="text-xs text-muted-foreground">{rolLabels[user.rol] ?? user.rol}</p>
          </div>
        )}
        <Button variant="outline" size="sm" onClick={handleLogout}>
          <LogOut className="mr-2 h-4 w-4" />
          Salir
        </Button>
      </div>
    </header>
  );
}
