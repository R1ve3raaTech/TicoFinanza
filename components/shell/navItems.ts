import { ChartBar, GearSix, SquaresFour, type Icon } from "@phosphor-icons/react";

export interface NavItem {
  href: string;
  label: string;
  icon: Icon;
  /** Final de la ruta que marca la sección como activa. */
  match: string;
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: SquaresFour, match: "/dashboard" },
  { href: "/dashboard/insights", label: "Estadísticas", icon: ChartBar, match: "/insights" },
  { href: "/dashboard/settings", label: "Ajustes", icon: GearSix, match: "/settings" },
];

/** Se compara por el final de la ruta y no por igualdad exacta, para que las
 *  secciones sigan marcadas si algún día tienen subrutas. */
export function isNavActive(pathname: string, item: NavItem): boolean {
  return pathname === item.href || pathname.endsWith(item.match);
}
