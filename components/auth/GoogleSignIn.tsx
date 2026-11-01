"use client";

import { useState } from "react";
import { GoogleMark } from "@/components/GoogleMark";
import { Button } from "@/components/ui/Button";
import { signInWithGoogle } from "@/lib/supabase/client";

/**
 * Único camino de entrada a la app: Google, con los permisos básicos de
 * perfil (openid, email, profile). No hay contraseñas que guardar ni
 * recuperar, y la app no pide acceso a ningún otro dato de la cuenta.
 */
export function GoogleSignIn({
  disabled = false,
  initialError,
  signOutWarning = false,
}: {
  /** Falta configurar Supabase o Google en el servidor. */
  disabled?: boolean;
  initialError?: string;
  signOutWarning?: boolean;
}) {
  const [starting, setStarting] = useState(false);
  const error = initialError;

  return (
    <div className="flex w-full flex-col gap-4">
      {/* Botón neutro, no celeste: las guías de marca de Google piden que el
          logo vaya sobre una superficie clara u oscura, no sobre otro color.
          Al ser la única acción de la pantalla igual manda sin pintarse. */}
      <Button
        variant="secondary"
        className="h-11 w-full"
        disabled={disabled || starting}
        onClick={() => {
          setStarting(true);
          signInWithGoogle();
        }}
      >
        <GoogleMark size={18} />
        {starting ? "Abriendo Google…" : "Continuar con Google"}
      </Button>

      {error && (
        <p role="alert" className="text-sm text-expense">
          {error}
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
