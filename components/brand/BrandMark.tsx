/**
 * Símbolo de TicoFinanza.
 *
 * Tres formas horizontales apiladas: arriba una pieza suelta y redondeada
 * que todavía no calza con el resto, al medio una barra partida con la marca
 * de acento, y abajo una barra entera y cuadrada. Se lee como información que
 * entra, se procesa y queda ordenada, sin dibujar literalmente ese proceso.
 *
 * Funciona en un color (`currentColor`): claro sobre fondo oscuro, oscuro
 * sobre fondo claro. `accent` pinta únicamente la pieza chica del medio.
 *
 * Para reemplazarlo por un asset definitivo: cambiar solo la geometría de
 * este SVG (mantener el viewBox de 24) y la copia en `public/brand/mark.svg`,
 * y regenerar los íconos con `node scripts/generate-brand-icons.mjs`.
 */
export function BrandMark({
  size = 20,
  accent = false,
  title,
  className = "",
}: {
  size?: number;
  accent?: boolean;
  /** Nombre accesible si el símbolo aparece solo (sin el nombre al lado). */
  title?: string;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
      className={className}
    >
      <path d="M10.5 2.5H21.5V7.5H10.5A2.5 2.5 0 0 1 10.5 2.5Z" fill="currentColor" />
      <rect x="2.5" y="9.5" width="13" height="5" fill="currentColor" />
      <rect
        x="17.5"
        y="9.5"
        width="4"
        height="5"
        fill={accent ? "var(--brand-accent)" : "currentColor"}
      />
      <rect x="2.5" y="16.5" width="19" height="5" fill="currentColor" />
    </svg>
  );
}
