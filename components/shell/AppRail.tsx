"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BrandMark } from "@/components/brand/BrandMark";
import { NAV_ITEMS, isNavActive } from "./navItems";
import { UserMenu } from "./UserMenu";

/**
 * Rail de navegación de tablet y escritorio (`md` en adelante).
 *
 * - md–xl: angosto, ícono con el nombre abajo. En una tablet o una laptop
 *   chica le deja casi todo el ancho al contenido.
 * - xl+: ícono y nombre en línea, y la cuenta con nombre y correo.
 *
 * La sección activa se marca con el nombre en tinta plena, el ícono relleno
 * y una marca fina de acento en el borde — nada de caja celeste alrededor.
 */
export function AppRail({
  name,
  email,
  avatarUrl,
}: {
  name?: string;
  email?: string;
  avatarUrl?: string;
}) {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 z-40 hidden h-[100dvh] w-[88px] shrink-0 flex-col border-r border-line bg-ground md:flex xl:w-[232px]">
      <div className="flex h-16 shrink-0 items-center justify-center xl:justify-start xl:px-5">
        <Link
          href="/dashboard"
          aria-label="TicoFinanza, ir al dashboard"
          className="inline-flex items-center gap-2 rounded-control text-ink"
        >
          <BrandMark size={22} />
          <span className="hidden text-[0.9375rem] font-semibold leading-none tracking-[-0.02em] xl:inline">
            TicoFinanza
          </span>
        </Link>
      </div>

      <nav aria-label="Principal" className="flex-1 px-2 pt-3 xl:px-3">
        <ul className="flex flex-col gap-1">
          {NAV_ITEMS.map((item) => {
            const active = isNavActive(pathname, item);
            const Icon = item.icon;
            return (
              <li key={item.href} className="relative">
                <span
                  aria-hidden
                  className={`absolute -left-2 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-[2px] bg-accent transition-opacity duration-150 xl:-left-3 ${
                    active ? "opacity-100" : "opacity-0"
                  }`}
                />
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`flex flex-col items-center gap-1 rounded-control px-1 py-2.5 text-micro font-medium transition-colors duration-150 xl:flex-row xl:gap-2.5 xl:px-2.5 xl:py-2 xl:text-sm ${
                    active ? "text-ink" : "text-ink-3 hover:bg-surface-hover hover:text-ink"
                  }`}
                >
                  <Icon size={20} weight={active ? "fill" : "regular"} className="shrink-0" />
                  <span className="max-w-full truncate">{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="shrink-0 border-t border-line p-2 xl:p-3">
        <UserMenu name={name} email={email} avatarUrl={avatarUrl} />
      </div>
    </aside>
  );
}
