import { formatMoney } from "@/lib/format";

// Signo menos tipográfico (U+2212), no el guion: mide lo mismo que el "+" y
// no se confunde con un separador.
const MINUS = "−";

function split(value: number, plus: boolean) {
  const sign = value < 0 ? MINUS : plus && value > 0 ? "+" : "";
  const digits = formatMoney(Math.abs(value)).replace(/^₡\s?/, "");
  return { sign, digits };
}

/**
 * Monto con signo explícito. El signo va siempre escrito (no solo el color):
 * ingreso/gasto tiene que leerse igual con daltonismo o en escala de grises.
 *
 * Para un movimiento: `<Money value={income ? amount : -amount} plus />`.
 */
export function Money({
  value,
  plus = false,
  tabular = true,
  className = "",
}: {
  value: number;
  /** Mostrar "+" en los positivos. */
  plus?: boolean;
  /** Cifras de ancho fijo: sí en columnas y listas (para que alineen), no en
   *  cifras sueltas grandes, donde los dígitos iguales se ven desparejos. */
  tabular?: boolean;
  className?: string;
}) {
  const { sign, digits } = split(value, plus);
  return (
    <span className={`${tabular ? "money " : ""}whitespace-nowrap ${className}`}>
      {sign}₡{digits}
    </span>
  );
}

/**
 * Cifra protagonista (el saldo). Una sola por pantalla. El símbolo del colón
 * va más chico y en gris para que manden los dígitos — es el detalle
 * tipográfico que distingue el número principal de la app. Cifras
 * proporcionales: sola y a este tamaño no tiene nada con qué alinear.
 */
export function MoneyDisplay({ value, className = "" }: { value: number; className?: string }) {
  const { sign, digits } = split(value, false);
  return (
    <span className={`whitespace-nowrap ${className}`}>
      {sign}
      <span className="mr-[0.06em] text-[0.6em] font-normal tracking-normal text-ink-3">₡</span>
      {digits}
    </span>
  );
}
