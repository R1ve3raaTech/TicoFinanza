import Link from "next/link";
import { Logo } from "@/components/Logo";
import { AUTH_CONFIGURATION_ERROR, getSupabaseConfig } from "@/lib/supabase/config";
import { GoogleSignIn } from "./GoogleSignIn";
import { IdleNoticeDialog } from "./IdleNoticeDialog";

/**
 * Pantalla de entrada.
 *
 * **El producto va de fondo y la tarjeta flota encima.** Antes eran dos
 * mitades exactas, las dos oscuras y separadas por una línea: ninguna
 * mandaba, y en una página cuyo único trabajo es que toques un botón, no
 * saber dónde mirar es el problema más caro. La mitad derecha además se
 * había convertido en una landing metida en media pantalla —titular,
 * bajada, una maqueta y cuatro bloques de texto, que ya no cabían.
 *
 * Ahora hay una sola jerarquía: la tarjeta. El fondo contesta "¿qué voy a
 * ver adentro?" sin pedir que lo lean, porque **es una captura de verdad
 * del resumen**, no una maqueta dibujada a mano que se desactualiza contra
 * la app (la anterior todavía mostraba el rail lateral que ya no existe).
 *
 * Hay una captura por tema y se eligen con una variable de CSS
 * (`--shot-entrar`), así el navegador baja solo la que corresponde.
 *
 * En teléfono no hay fondo: una captura de escritorio reducida a 390px no
 * se lee, y de paso la página pesa menos justo donde la conexión es peor.
 */
export function AuthPage({
  initialError,
  signOutWarning,
  idleNotice,
}: {
  initialError?: string;
  signOutWarning?: boolean;
  /** La sesión se cerró sola por inactividad. */
  idleNotice?: boolean;
}) {
  const configured = Boolean(getSupabaseConfig());

  return (
    <main className="relative flex min-h-[100dvh] items-center justify-center overflow-hidden bg-ground px-4 py-10 sm:px-6">
      {idleNotice && <IdleNoticeDialog />}

      <div aria-hidden className="pointer-events-none absolute inset-0 hidden md:block">
        <div className="fondo-entrar absolute inset-0" />
        {/* El velo (ver `.velo-entrar` en globals.css): la captura tiene
            que leerse como textura, no como algo que haya que mirar. */}
        <div className="velo-entrar absolute inset-0" />
      </div>

      <div className="animate-fade-up relative w-full max-w-[25.5rem] rounded-dialog border border-line bg-surface p-6 shadow-[0_30px_80px_-24px_rgb(0_0_0/0.55)] sm:p-8">
        <Link
          href="/"
          aria-label="TicoFinanza, ir al inicio"
          className="inline-block w-fit rounded-control"
        >
          <Logo size="lg" accent />
        </Link>

        <h1 className="mt-7 text-[1.75rem] font-semibold leading-[1.1] tracking-[-0.03em] text-ink sm:text-[2rem]">
          Entrá a tu cuenta
        </h1>
        <p className="mt-2.5 text-sm leading-relaxed text-ink-2">
          Con tu cuenta de Google. Sin contraseñas, y sin acceso a tu banco ni a tus correos.
        </p>

        <div className="mt-7">
          <GoogleSignIn
            disabled={!configured}
            initialError={configured ? initialError : AUTH_CONFIGURATION_ERROR}
            signOutWarning={signOutWarning}
          />
        </div>
      </div>
    </main>
  );
}
