// Menú lateral con navegación filtrada por rol.
// En móvil se muestra como drawer (Sheet); en escritorio, fijo a la izquierda.

import { NavLink } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { menuForRol } from "@/components/menuConfig";
import { cn } from "@/lib/utils";

export function Sidebar() {
  const { user } = useAuth();
  if (!user) return null;

  const items = menuForRol(user.rol);

  return (
    <nav className="flex flex-col gap-1 p-4">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )
            }
          >
            <Icon className="h-5 w-5" />
            {item.label}
          </NavLink>
        );
      })}
    </nav>
  );
}
