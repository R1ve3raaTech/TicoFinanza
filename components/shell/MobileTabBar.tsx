"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS, isNavActive } from "./navItems";

/**
 * Navegación de teléfono. Son tres secciones pares y se salta entre ellas
 * todo el tiempo, así que van abajo, al alcance del pulgar y siempre a la
 * vista — antes Estadísticas y Ajustes eran pantallas "hijas" con flecha de
 * volver, y para ir de una a la otra había que pasar por el dashboard.
 */
export function MobileTabBar() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Principal"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-ground pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <ul className="mx-auto flex h-14 max-w-lg">
        {NAV_ITEMS.map((item) => {
          const active = isNavActive(pathname, item);
          const Icon = item.icon;
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`relative flex h-full flex-col items-center justify-center gap-0.5 text-micro font-medium transition-colors duration-150 ${
                  active ? "text-ink" : "text-ink-3"
                }`}
              >
                <span
                  aria-hidden
                  className={`absolute -top-px h-0.5 w-8 bg-accent transition-opacity duration-150 ${
                    active ? "opacity-100" : "opacity-0"
                  }`}
                />
                <Icon size={22} weight={active ? "fill" : "regular"} />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
