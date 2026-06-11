// Configuración del menú lateral en acordeón.
// 6 paquetes según los módulos definidos por la ingeniera.
// Cada paquete tiene subitems que corresponden a CUs navegables.
// La visibilidad de paquetes y subitems se filtra por rol.

import {
  ShieldCheck,
  Users,
  UserCircle,
  BookOpen,
  ClipboardList,
  Calculator,
  UsersRound,
  GraduationCap,
  Group,
  Award,
  FileBarChart,
  LayoutDashboard,
  Settings,
  CalendarRange,
  type LucideIcon,
} from "lucide-react";
import { type Rol } from "@/context/AuthContext";

// ── Tipos ─────────────────────────────────────────────────────────────────────

export interface MenuItem {
  label: string;
  path: string;
  icon: LucideIcon;
  roles: Rol[];
  // Placeholder: si true, el subitem existe pero aún no tiene página implementada.
  placeholder?: boolean;
}

export interface MenuPackage {
  id: string;
  label: string;        // Nombre del paquete en español (sin la palabra "Paquete")
  icon: LucideIcon;     // Ícono representativo del paquete (visible en modo colapsado)
  roles: Rol[];         // Roles que ven el paquete (si al menos un subitem es visible)
  items: MenuItem[];
}

// ── Paquetes del menú ─────────────────────────────────────────────────────────

export const menuPackages: MenuPackage[] = [

  // ─── 1. Autenticación y Seguridad ──────────────────────────────────────────
  {
    id: "autenticacion",
    label: "Autenticación y Seguridad",
    icon: ShieldCheck,
    roles: ["admin"],
    items: [
      {
        label: "Usuarios del sistema",
        path: "/usuarios",
        icon: UserCircle,
        roles: ["admin"],
        // UC-02: CRUD de usuarios internos (admin, coordinador, autoridad, docente)
      },
      // Recuperar contraseña (UC-22) vive fuera del menú — páginas públicas
    ],
  },

  // ─── 2. Gestión de Postulantes ─────────────────────────────────────────────
  {
    id: "postulantes",
    label: "Gestión de Postulantes",
    icon: Users,
    roles: ["admin", "coordinador_academico", "autoridad", "postulante"],
    items: [
      {
        label: "Postulantes",
        path: "/postulantes",
        icon: Users,
        roles: ["admin", "coordinador_academico", "autoridad"],
        // UC-03/04/05: registro, listado, edición y eliminación
      },
      {
        label: "Mis materias",
        path: "/mis-materias",
        icon: BookOpen,
        roles: ["postulante"],
        // UC-23: el postulante ve su grupo, aula, horario y docente por materia
      },
      {
        label: "Mis notas",
        path: "/mis-notas",
        icon: ClipboardList,
        roles: ["postulante"],
        // UC-23: el postulante ve sus 3 notas por materia y el promedio
      },
    ],
  },

  // ─── 3. Exámenes y Calificaciones ──────────────────────────────────────────
  {
    id: "examenes",
    label: "Exámenes y Calificaciones",
    icon: BookOpen,
    roles: ["admin", "coordinador_academico"],
    items: [
      {
        label: "Registro de notas",
        path: "/notas",
        icon: ClipboardList,
        roles: ["admin", "coordinador_academico"],
        placeholder: true,
        // UC-12: carga individual o por lote de las 3 notas por materia
      },
      {
        label: "Calcular promedios",
        path: "/notas/calcular",
        icon: Calculator,
        roles: ["admin", "coordinador_academico"],
        placeholder: true,
        // UC-13: calcula promedio ponderado y actualiza estado aprobado/reprobado
      },
    ],
  },

  // ─── 4. Grupos y Docentes ──────────────────────────────────────────────────
  {
    id: "grupos-docentes",
    label: "Grupos y Docentes",
    icon: UsersRound,
    roles: ["admin", "docente"],
    items: [
      {
        label: "Docentes",
        path: "/docentes",
        icon: GraduationCap,
        roles: ["admin"],
        placeholder: true,
        // UC-11: CRUD de docentes con cuenta de usuario opcional
      },
      {
        label: "Grupos",
        path: "/grupos",
        icon: Group,
        roles: ["admin"],
        placeholder: true,
        // UC-14/15: generación automática y asignación de docentes a grupos
      },
      {
        label: "Asignación de cupos",
        path: "/cupos",
        icon: Award,
        roles: ["admin"],
        placeholder: true,
        // UC-16: algoritmo de asignación a carrera por promedio
      },
      {
        label: "Mis grupos",
        path: "/mis-grupos",
        icon: Group,
        roles: ["docente"],
        placeholder: true,
        // UC-17: el docente ve sus grupos, horarios y carga
      },
    ],
  },

  // ─── 5. Reportes ───────────────────────────────────────────────────────────
  {
    id: "reportes",
    label: "Reportes",
    icon: FileBarChart,
    roles: ["admin", "autoridad"],
    items: [
      {
        label: "Generar reportes",
        path: "/reportes",
        icon: FileBarChart,
        roles: ["admin", "autoridad"],
        placeholder: true,
        // UC-18/19: reportes dinámicos con filtros + preview + descarga PDF/Excel
      },
    ],
  },

  // ─── 6. Panel Administrativo ───────────────────────────────────────────────
  {
    id: "administracion",
    label: "Panel Administrativo",
    icon: LayoutDashboard,
    roles: ["admin", "autoridad"],
    items: [
      {
        label: "Dashboard",
        path: "/dashboard",
        icon: LayoutDashboard,
        roles: ["admin", "autoridad"],
        // UC-09: KPIs de la gestión activa
      },
      {
        label: "Gestiones",
        path: "/gestiones",
        icon: CalendarRange,
        roles: ["admin"],
        // UC-21: crear gestión, activar, avanzar de fase
      },
      {
        label: "Carreras",
        path: "/carreras",
        icon: GraduationCap,
        roles: ["admin"],
        // UC-10: ver y editar cupo máximo de las 4 carreras
      },
      {
        label: "Configuración",
        path: "/configuracion",
        icon: Settings,
        roles: ["admin"],
        // UC-08: parámetros del sistema
      },
    ],
  },

];

// ── Helpers ───────────────────────────────────────────────────────────────────

// Filtra los paquetes visibles para un rol, y dentro de cada paquete
// filtra también los subitems visibles para ese rol.
export function packagesForRol(rol: Rol): MenuPackage[] {
  return menuPackages
    .filter((pkg) => pkg.roles.includes(rol))
    .map((pkg) => ({
      ...pkg,
      items: pkg.items.filter((item) => item.roles.includes(rol)),
    }))
    .filter((pkg) => pkg.items.length > 0);
}