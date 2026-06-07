// Menú lateral con navegación filtrada por rol, agrupada por sección.
// Soporta modo colapsado (solo íconos) en escritorio. En móvil va dentro del Sheet.

import { NavLink } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { menuForRol, groupLabels, type MenuGroup } from "@/components/menuConfig";
import { Logo } from "@/components/Logo";
import { cn } from "@/lib/utils";

interface SidebarProps {
  // Si está colapsado, muestra solo íconos (escritorio).
  collapsed?: boolean;
  // Callback al hacer clic en un ítem (para cerrar el Sheet en móvil).
  onNavigate?: () => void;
}

export function Sidebar({ collapsed = false, onNavigate }: SidebarProps) {
  const { user } = useAuth();
  if (!user) return null;

  const items = menuForRol(user.rol);

  // Orden de los grupos a renderizar.
  const groups: MenuGroup[] = ["principal", "administracion"];

  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      {/* Encabezado con el escudo */}
      <div
        className={cn(
          "flex items-center gap-3 border-b border-sidebar-border px-4 py-4",
          collapsed && "justify-center px-2"
        )}
      >
        <Logo size={collapsed ? 32 : 36} glow={false} />
        {!collapsed && (
          <div className="leading-tight">
            <p className="font-heading text-sm font-bold">CUP-FICCT</p>
            <p className="text-[11px] text-sidebar-foreground/60">Admisión</p>
          </div>
        )}
      </div>

      {/* Navegación agrupada */}
      <nav className="flex-1 overflow-y-auto py-4">
        {groups.map((group) => {
          const groupItems = items.filter((i) => i.group === group);
          if (groupItems.length === 0) return null;

          return (
            <div key={group} className="mb-4">
              {/* Encabezado de grupo (oculto si está colapsado) */}
              {!collapsed && (
                <p className="px-5 pb-2 text-[11px] font-semibold uppercase tracking-wider text-sidebar-foreground/40">
                  {groupLabels[group]}
                </p>
              )}
              <div className="flex flex-col gap-1 px-3">
                {groupItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      onClick={onNavigate}
                      title={collapsed ? item.label : undefined}
                      className={({ isActive }) =>
                        cn(
                          "group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                          collapsed && "justify-center px-2",
                          isActive
                            ? "bg-sidebar-accent text-sidebar-accent-foreground"
                            : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                        )
                      }
                    >
                      {({ isActive }) => (
                        <>
                          {/* Barrita de acento a la izquierda cuando está activo */}
                          {isActive && (
                            <span className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-sidebar-primary" />
                          )}
                          <Icon
                            className={cn(
                              "h-5 w-5 shrink-0 transition-transform duration-200 group-hover:scale-110",
                              isActive && "text-sidebar-primary"
                            )}
                          />
                          {!collapsed && <span className="truncate">{item.label}</span>}
                        </>
                      )}
                    </NavLink>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>
    </div>
  );
}
