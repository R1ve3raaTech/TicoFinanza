"use client";

import { useId, useRef, useState } from "react";
import Link from "next/link";
import { GoogleMark } from "@/components/GoogleMark";
import { Button } from "@/components/ui/Button";
import { signInWithGoogle } from "@/lib/supabase/client";
import { signInWithGoogleNative } from "@/lib/googleNative";

/**
 * Único camino de entrada a la app: Google, con los permisos básicos de
 * perfil (openid, email, profile). No hay contraseñas que guardar ni
 * recuperar, y la app no pide acceso a ningún otro dato de la cuenta.
 *
 * Los términos se aceptan marcando la casilla, no por el hecho de entrar.
 * Antes decía "al entrar aceptás los términos" en letra chica debajo del
 * botón: válido, pero nadie lo lee. Un consentimiento que se da sin saber
 * que se está dando no sirve de mucho en una app que guarda datos
 * financieros.
 *
 * La casilla es un `<input type="checkbox">` de verdad con su `<label>`, y
 * los enlaces legales van **fuera** de esa etiqueta: un enlace dentro de un
 * label hace que tocarlo marque la casilla además de abrir la página, y
 * según el navegador termina marcando dos veces o ninguna.
 *
 * **Dentro del APK el camino es otro** (`lib/googleNative.ts`): se le pide
 * el token al sistema en vez de abrir una página de Google. Si se abriera,
 * Capacitor se la entregaría al navegador del teléfono y la sesión quedaría
 * en Brave o en Chrome, no en la app — que es exactamente lo que pasaba
 * antes de esto. El botón, la casilla y los textos son los mismos: lo único
 * que cambia es de dónde sale el token.
 */
export function GoogleSignIn({
  disabled = false,
  initialError,
  signOutWarning = false,
  googleClientId,
}: {
  /** Falta configurar Supabase o Google en el servidor. */
  disabled?: boolean;
  initialError?: string;
  signOutWarning?: boolean;
  /**
   * El ID del cliente web de Google.
   *
   * **Su presencia ES la señal de que esto es el APK.** El servidor solo lo
   * manda en ese caso (ver `AuthPage`), así que acá no hay que volver a
   * preguntarlo. Se intentó con `useIsApp()` y fue un bug: ese contexto
   * solo está montado dentro de `/dashboard`, y estas dos pantallas
   * —`/entrar` y `/bienvenida`— quedan afuera, así que devolvía `false` y
   * el camino nativo no se intentaba nunca. El login se iba al navegador.
   *
   * No es un secreto: ya viaja en la URL de consentimiento del flujo web.
   */
  googleClientId?: string | null;
}) {
  const [starting, setStarting] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [accepted, setAccepted] = useState(false);
  const [missing, setMissing] = useState(false);
  const boxRef = useRef<HTMLInputElement>(null);
  const boxId = useId();
  const errorId = useId();

  async function start() {
    if (!accepted) {
      // El botón queda habilitado a propósito: uno deshabilitado no recibe
      // foco ni explica por qué no anda. Mejor dejar que se toque y decir
      // exactamente qué falta.
      setMissing(true);
      boxRef.current?.focus();
      return;
    }
    setFailure(null);
    setStarting(true);

    // Que haya ID de cliente quiere decir que el servidor reconoció el APK.
    // Si el puente nativo igual no está, la función contesta
    // "no-disponible" y se sigue por el camino de la web: nadie se queda
    // mirando un botón que no hace nada.
    if (googleClientId) {
      const resultado = await signInWithGoogleNative(googleClientId);

      if (resultado.estado === "ok") {
        // Recarga entera, no router.push: la sesión se escribió en cookies
        // desde una ruta del servidor, fuera del router. Un push navega con
        // el árbol que ya tiene en memoria —dibujado cuando NO había
        // sesión— y el cerrojo y el layout de /dashboard se montarían con
        // los datos de alguien sin cuenta.
        // eslint-disable-next-line @next/next/no-location-assign-relative-destination
        window.location.href = "/dashboard";
        return;
      }
      if (resultado.estado === "cancelado") {
        // Cerró el selector de cuentas. No pasó nada malo y no hay nada que
        // decirle: un mensaje de error acá sería culpar a alguien por
        // cambiar de opinión.
        setStarting(false);
        return;
      }
      if (resultado.estado === "error") {
        setFailure(resultado.motivo);
        setStarting(false);
        return;
      }
      // "no-disponible": el envoltorio no expone el plugin. Sigue por el
      // camino de la web, que al menos deja entrar aunque sea en el
      // navegador del sistema.
    }

    signInWithGoogle();
  }

  return (
    <div className="flex w-full flex-col gap-4">
      <div className="flex items-start gap-2.5">
        <input
          ref={boxRef}
          id={boxId}
          type="checkbox"
          checked={accepted}
          aria-describedby={missing ? errorId : undefined}
          onChange={(e) => {
            setAccepted(e.target.checked);
            setMissing(false);
          }}
          className={`mt-0.5 h-[18px] w-[18px] shrink-0 cursor-pointer appearance-none rounded-[5px] border bg-surface transition-colors duration-150 checked:border-accent checked:bg-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
            missing ? "border-expense" : "border-line-strong hover:border-ink-3"
          } checked:bg-[length:11px] checked:bg-center checked:bg-no-repeat checked:[background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' fill='none' stroke='white' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'><path d='M2.5 8.5l3.5 3.5 7.5-7.5'/></svg>")]`}
        />
        <label htmlFor={boxId} className="cursor-pointer text-meta leading-relaxed text-ink-2">
          Acepto los términos de servicio y la política de privacidad.
        </label>
      </div>

      {/* Botón neutro, no celeste: las guías de marca de Google piden que el
          logo vaya sobre una superficie clara u oscura, no sobre otro color.
          Al ser la única acción de la pantalla igual manda sin pintarse. */}
      <Button
        variant="secondary"
        className="h-11 w-full"
        disabled={disabled || starting}
        onClick={start}
      >
        <GoogleMark size={18} />
        {starting ? "Abriendo Google…" : "Continuar con Google"}
      </Button>

      {missing && (
        <p id={errorId} role="alert" className="text-meta text-expense">
          Marcá la casilla para continuar.
        </p>
      )}

      {failure && (
        <p role="alert" className="text-meta text-expense">
          {failure}
        </p>
      )}

      <p className="text-meta leading-relaxed text-ink-3">
        Leé los{" "}
        <Link href="/terminos" className="underline underline-offset-4 hover:text-ink">
          términos de servicio
        </Link>{" "}
        y la{" "}
        <Link href="/privacidad" className="underline underline-offset-4 hover:text-ink">
          política de privacidad
        </Link>
        .
      </p>

      {initialError && (
        <p role="alert" className="text-sm text-expense">
          {initialError}
        </p>
      )}

      {signOutWarning && (
        <p role="status" className="text-meta text-warn">
          Saliste de este navegador, pero no pudimos confirmar la revocación de la sesión. Las
          sesiones de otros dispositivos podrían seguir activas.
        </p>
      )}
    </div>
  );
}
