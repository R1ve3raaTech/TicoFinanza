import {
  ArrowsLeftRight,
  Receipt,
  SquaresFour,
  Target,
  type Icon,
} from "@phosphor-icons/react";

export interface NavItem {
  href: string;
  label: string;
  /** Etiqueta corta para la barra de teléfono, donde no caben cinco largas. */
  shortLabel?: string;
  icon: Icon;
  /** Final de la ruta que marca la sección como activa. */
  match: string;
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Resumen", icon: SquaresFour, match: "/dashboard" },
  { href: "/dashboard/fijos", label: "Fijos", icon: Receipt, match: "/fijos" },
  {
    href: "/dashboard/movimientos",
    label: "Movimientos",
    shortLabel: "Movs.",
    icon: ArrowsLeftRight,
    match: "/movimientos",
  },
  { href: "/dashboard/plan", label: "Plan", icon: Target, match: "/plan" },
];

/**
 * Ajustes NO está en esta lista: dejó de ser una pantalla y pasó a ser un
 * diálogo (components/settings/SettingsEntry.tsx). Las dos píldoras dibujan
 * su botón aparte, después de estos cuatro destinos.
 */

/** Se compara por el final de la ruta y no por igualdad exacta, para que las
 *  secciones sigan marcadas si algún día tienen subrutas. */
export function isNavActive(pathname: string, item: NavItem): boolean {
  return pathname === item.href || pathname.endsWith(item.match);
}
