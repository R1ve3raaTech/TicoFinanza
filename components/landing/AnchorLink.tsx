"use client";

import type { AnchorHTMLAttributes, MouseEvent, ReactNode } from "react";

/**
 * Ancla a una sección de la landing sin dejar el #hash en la URL — con
 * <a href="#id"> normal, el navegador lo agrega a la barra de direcciones.
 * Hace scroll a mano y cae de vuelta al comportamiento nativo si el
 * elemento no existe (sin JS, o la sección no está en la página actual).
 */
export function AnchorLink({
  href,
  className,
  children,
  // El resto se reenvía: sin esto, atributos como `aria-current` se perdían
  // en silencio y el enlace quedaba sin decir que es el de la sección
  // actual.
  ...rest
}: AnchorHTMLAttributes<HTMLAnchorElement> & {
  href: string;
  className?: string;
  children: ReactNode;
}) {
  function handleClick(e: MouseEvent<HTMLAnchorElement>) {
    const el = document.getElementById(href.slice(1));
    if (!el) return;
    e.preventDefault();
    el.scrollIntoView({ behavior: "smooth" });
  }

  return (
    <a {...rest} href={href} className={className} onClick={handleClick}>
      {children}
    </a>
  );
}
