// Menú lateral en acordeón con 6 paquetes.
// Cada paquete se expande/colapsa mostrando sus subitems (CUs navegables).
// En modo colapsado (solo íconos), los paquetes no se despliegan —
// el usuario debe expandir el sidebar para navegar (Opción B acordada).
// Requiere: npx shadcn@latest add collapsible

import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { ChevronDown } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { packagesForRol, type MenuPackage } from "@/components/menuConfig";
import { Logo } from "@/components/Logo";
import { cn } from "@/lib/utils";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface SidebarProps {
  collapsed?: boolean;
  onNavigate?: () => void;
}

// ── Subitem individual ────────────────────────────────────────────────────────
function SidebarItem({
  item,
  collapsed,
  onNavigate,
}: {
  item: ReturnType<typeof packagesForRol>[0]["items"][0];
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  if (collapsed) return null; // En modo colapsado no se muestran subitems (Opción B)

  return (
    <NavLink
      to={item.path}
      title={item.label}
      className={({ isActive }) =>
        cn(
          "group relative flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-all duration-200",
          item.placeholder
            ? "cursor-not-allowed opacity-50"
            : isActive
            ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
            : "text-sidebar-foreground/65 hover:bg-sidebar-accent/40 hover:text-sidebar-foreground"
        )
      }
      onClick={(e) => {
        // Páginas pendientes: no navegan, muestran el placeholder.
        // Páginas implementadas: cierran el Sheet en móvil.
        if (item.placeholder) {
          e.preventDefault();
          return;
        }
        onNavigate?.();
      }}
    >
      {({ isActive }) => (
        <>
          {/* Barrita de acento izquierda cuando está activo */}
          {isActive && !item.placeholder && (
            <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-r-full bg-sidebar-primary" />
          )}
          <item.icon
            className={cn(
              "h-4 w-4 shrink-0",
              isActive && !item.placeholder && "text-sidebar-primary"
            )}
          />
          <span className="truncate">{item.label}</span>
          {item.placeholder && (
            <span className="ml-auto rounded-sm bg-sidebar-foreground/10 px-1 py-0.5 text-[10px] font-medium">
              Próx.
            </span>
          )}
        </>
      )}
    </NavLink>
  );
}

// ── Paquete (acordeón) ────────────────────────────────────────────────────────
function SidebarPackage({
  pkg,
  collapsed,
  onNavigate,
  defaultOpen,
}: {
  pkg: MenuPackage;
  collapsed: boolean;
  onNavigate?: () => void;
  defaultOpen: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  if (collapsed) {
    // Modo colapsado: solo muestra el ícono del paquete, sin acordeón
    return (
      <div
        className="flex items-center justify-center py-2"
        title={pkg.label}
      >
        <pkg.icon className="h-5 w-5 text-sidebar-foreground/60" />
      </div>
    );
  }

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger
        className={cn(
          "flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left transition-colors duration-200",
          open
            ? "text-sidebar-foreground"
            : "text-sidebar-foreground/70 hover:text-sidebar-foreground",
          "hover:bg-sidebar-accent/30"
        )}
      >
        <div className="flex items-center gap-2.5">
          <pkg.icon
            className={cn(
              "h-4.5 w-4.5 shrink-0",
              open && "text-sidebar-primary"
            )}
          />
          <span className="text-sm font-medium">{pkg.label}</span>
        </div>
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 text-sidebar-foreground/40 transition-transform duration-200",
            open && "rotate-180"
          )}
        />
      </CollapsibleTrigger>

      <CollapsibleContent>
        {/* Subitems con línea guía izquierda */}
        <div className="relative ml-4 mt-0.5 flex flex-col gap-0.5 border-l border-sidebar-border/60 pl-3 pb-1">
          {pkg.items.map((item) => (
            <SidebarItem
              key={item.path}
              item={item}
              collapsed={false}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

// ── Sidebar principal ─────────────────────────────────────────────────────────
export function Sidebar({ collapsed = false, onNavigate }: SidebarProps) {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) return null;

  const packages = packagesForRol(user.rol);

  // Abre por defecto el paquete que contiene la ruta activa
  function isPackageActive(pkg: MenuPackage) {
    return pkg.items.some((item) => location.pathname.startsWith(item.path));
  }

  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      {/* Encabezado */}
      <div
        className={cn(
          "flex items-center gap-3 border-b border-sidebar-border px-4 py-4",
          collapsed && "justify-center px-2"
        )}
      >
        <Logo size={collapsed ? 30 : 34} glow={false} />
        {!collapsed && (
          <div className="leading-tight">
            <p className="font-heading text-sm font-bold">CUP-FICCT</p>
            <p className="text-[11px] text-sidebar-foreground/55">Admisión</p>
          </div>
        )}
      </div>

      {/* Paquetes en acordeón */}
      <nav className="flex-1 overflow-y-auto py-3">
        <div className={cn("flex flex-col gap-0.5", collapsed ? "px-2" : "px-3")}>
          {packages.map((pkg) => (
            <SidebarPackage
              key={pkg.id}
              pkg={pkg}
              collapsed={collapsed}
              onNavigate={onNavigate}
              defaultOpen={isPackageActive(pkg)}
            />
          ))}
        </div>
      </nav>
    </div>
  );
}