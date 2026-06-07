// Configuración del menú lateral. Cada ítem declara qué roles lo ven y a qué grupo
// pertenece, para separarlos visualmente en el sidebar.

import {
  LayoutDashboard,
  Users,
  GraduationCap,
  Settings,
  CalendarRange,
  type LucideIcon,
} from "lucide-react";
import { type Rol } from "@/context/AuthContext";

// Grupos del menú (para encabezados de sección en el sidebar).
export type MenuGroup = "principal" | "administracion";

export interface MenuItem {
  label: string; // Etiqueta en español (UI)
  path: string;
  icon: LucideIcon;
  roles: Rol[]; // Roles que pueden ver el ítem
  group: MenuGroup;
}

// Orden y visibilidad del menú según el rol del usuario.
export const menuItems: MenuItem[] = [
  {
    label: "Panel de control",
    path: "/dashboard",
    icon: LayoutDashboard,
    roles: ["admin", "autoridad"],
    group: "principal",
  },
  {
    label: "Postulantes",
    path: "/postulantes",
    icon: Users,
    roles: ["admin", "coordinador_academico", "autoridad"],
    group: "principal",
  },
  {
    label: "Carreras",
    path: "/carreras",
    icon: GraduationCap,
    roles: ["admin"],
    group: "administracion",
  },
  {
    label: "Gestiones",
    path: "/gestiones",
    icon: CalendarRange,
    roles: ["admin"],
    group: "administracion",
  },
  {
    label: "Configuración",
    path: "/configuracion",
    icon: Settings,
    roles: ["admin"],
    group: "administracion",
  },
];

// Etiquetas legibles de cada grupo (en español).
export const groupLabels: Record<MenuGroup, string> = {
  principal: "General",
  administracion: "Administración",
};

// Filtra el menú dejando solo los ítems visibles para el rol indicado.
export function menuForRol(rol: Rol): MenuItem[] {
  return menuItems.filter((item) => item.roles.includes(rol));
}
