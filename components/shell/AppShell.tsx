import type { ReactNode } from "react";
import { MobileTabBar } from "./MobileTabBar";
import { TopNav } from "./TopNav";

/**
 * Estructura común de las pantallas con sesión: píldora flotante arriba
 * desde tablet, píldora flotante abajo en teléfono, y el contenido de cada
 * página en el medio (cada página decide su propio ancho).
 *
 * Las dos navegaciones flotan por encima del contenido, así que el relleno
 * que las despeja vive acá y no en cada pantalla: arriba el alto de la
 * píldora (12px de aire + 56px) en md, y abajo el de la píldora de teléfono
 * más la zona segura del iPhone.
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
    // `print:` oculta el cromo al imprimir: en el papel las dos píldoras no
    // sirven para nada y se comen el margen (ver el reporte mensual,
    // components/report/).
    <div className="flex min-h-[100dvh] w-full flex-col print:block print:min-h-0">
      <a
        href="#contenido"
        className="sr-only z-[80] rounded-control bg-surface px-3 py-2 text-sm text-ink focus:not-sr-only focus:fixed focus:left-3 focus:top-3"
      >
        Saltar al contenido
      </a>
      <div className="contents print:hidden">
        <TopNav name={name} email={email} avatarUrl={avatarUrl} />
      </div>
      <div className="flex min-w-0 flex-1 flex-col pb-[calc(4.75rem+env(safe-area-inset-bottom))] md:pb-0 md:pt-[68px] print:block print:p-0">
        {children}
      </div>
      <div className="contents print:hidden">
        <MobileTabBar />
      </div>
    </div>
  );
}
