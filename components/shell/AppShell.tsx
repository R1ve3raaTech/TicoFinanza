import type { ReactNode } from "react";
import { AppRail } from "./AppRail";
import { MobileTabBar } from "./MobileTabBar";

/**
 * Estructura común de las pantallas con sesión: rail a la izquierda desde
 * tablet, barra de pestañas abajo en teléfono, y el contenido de cada página
 * en el medio (cada página decide su propio ancho).
 */
export function AppShell({
  name,
  email,
  avatarUrl,
  children,
}: {
  name?: string;
  email?: string;
  avatarUrl?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-[100dvh] w-full">
      <a
        href="#contenido"
        className="sr-only z-[80] rounded-control bg-surface px-3 py-2 text-sm text-ink focus:not-sr-only focus:fixed focus:left-3 focus:top-3"
      >
        Saltar al contenido
      </a>
      <AppRail name={name} email={email} avatarUrl={avatarUrl} />
      <div className="flex min-w-0 flex-1 flex-col pb-[calc(3.5rem+env(safe-area-inset-bottom))] md:pb-0">
        {children}
      </div>
      <MobileTabBar />
    </div>
  );
}
