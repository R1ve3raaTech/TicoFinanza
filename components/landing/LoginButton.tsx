"use client";

import Link from "next/link";
import { SquaresFour } from "@phosphor-icons/react";
import { GoogleMark } from "@/components/GoogleMark";

export function LoginButton({
  large = false,
  loggedIn = false,
}: {
  large?: boolean;
  loggedIn?: boolean;
}) {
  const fullLabel = loggedIn ? "Ir al dashboard" : "Iniciar sesión con Google";
  // En el header de un teléfono, "Iniciar sesión con Google" no cabe en una
  // línea: partía el botón en dos y le comía el espacio al logo. Ahí va la
  // versión corta — el botón grande del hero, que sí tiene ancho, mantiene el
  // texto completo.
  const shortLabel = loggedIn ? "Dashboard" : "Entrar";

  return (
    <Link
      href={loggedIn ? "/dashboard" : "/entrar"}
      className={`inline-flex shrink-0 items-center whitespace-nowrap rounded-control bg-ink font-medium text-ground transition-colors duration-150 hover:bg-ink-2 ${
        large ? "h-12 gap-3 px-6 text-base" : "h-10 gap-2.5 px-4 text-sm"
      }`}
    >
      {loggedIn ? (
        <SquaresFour size={large ? 20 : 18} aria-hidden />
      ) : (
        <GoogleMark size={large ? 20 : 18} />
      )}
      {large ? (
        fullLabel
      ) : (
        <>
          <span className="sm:hidden">{shortLabel}</span>
          <span className="hidden sm:inline">{fullLabel}</span>
        </>
      )}
    </Link>
  );
}
