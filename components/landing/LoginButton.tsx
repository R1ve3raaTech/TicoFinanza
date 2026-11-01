"use client";

import Link from "next/link";
import { SquaresFour } from "@phosphor-icons/react";

export function LoginButton({
  large = false,
  loggedIn = false,
}: {
  large?: boolean;
  loggedIn?: boolean;
}) {
  const fullLabel = loggedIn ? "Ir al dashboard" : "Iniciar sesión";
  const shortLabel = loggedIn ? "Dashboard" : "Entrar";

  return (
    <Link
      href={loggedIn ? "/dashboard" : "/entrar"}
      className={`inline-flex shrink-0 items-center whitespace-nowrap rounded-control bg-ink font-medium text-ground transition-colors duration-150 hover:bg-ink-2 ${
        large ? "h-12 gap-3 px-6 text-base" : "h-10 gap-2.5 px-4 text-sm"
      }`}
    >
      {loggedIn && (
        <SquaresFour size={large ? 20 : 18} aria-hidden />
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
