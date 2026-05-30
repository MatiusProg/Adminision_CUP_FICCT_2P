// Configuración del menú lateral. Cada ítem declara qué roles lo ven.

import {
  LayoutDashboard,
  Users,
  GraduationCap,
  Settings,
  CalendarRange,
  type LucideIcon,
} from "lucide-react";
import { type Rol } from "@/context/AuthContext";

export interface MenuItem {
  label: string; // Etiqueta en español (UI)
  path: string;
  icon: LucideIcon;
  roles: Rol[]; // Roles que pueden ver el ítem
}

// Orden y visibilidad del menú según el rol del usuario.
export const menuItems: MenuItem[] = [
  {
    label: "Panel de control",
    path: "/dashboard",
    icon: LayoutDashboard,
    roles: ["admin", "autoridad"],
  },
  {
    label: "Postulantes",
    path: "/postulantes",
    icon: Users,
    roles: ["admin", "coordinador_academico", "autoridad"],
  },
  {
    label: "Carreras",
    path: "/carreras",
    icon: GraduationCap,
    roles: ["admin"],
  },
  {
    label: "Gestiones",
    path: "/gestiones",
    icon: CalendarRange,
    roles: ["admin"],
  },
  {
    label: "Configuración",
    path: "/configuracion",
    icon: Settings,
    roles: ["admin"],
  },
];

// Filtra el menú dejando solo los ítems visibles para el rol indicado.
export function menuForRol(rol: Rol): MenuItem[] {
  return menuItems.filter((item) => item.roles.includes(rol));
}
