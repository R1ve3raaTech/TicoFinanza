/**
 * Anotar en dólares, guardar en colones.
 *
 * La app es de una sola moneda y la base lo impone (`currency = 'CRC'`
 * desde la migración 0017). Esto no abre el multimoneda: convierte al
 * escribir y lo que se guarda es un monto en colones, igual que cualquier
 * otro. Sirve para la compra en Amazon o la suscripción que te cobran en
 * dólares, sin que el resto de la app tenga que saber que existen.
 *
 * El tipo de cambio es **un número que vos ponés**, no uno en vivo. Una tasa
 * traída de internet se ve precisa y no lo es: el banco te cobró la suya, y
 * esa es la que hace que el saldo cuadre. Se guarda la última que usaste.
 */

/** Referencia inicial, editable. No pretende ser la tasa del día. */
export const DEFAULT_USD_RATE = 510;

/** Fuera de este rango es un error de tecleo, no un tipo de cambio. */
export const MIN_USD_RATE = 100;
export const MAX_USD_RATE = 2000;

export function isValidRate(rate: number): boolean {
  return Number.isFinite(rate) && rate >= MIN_USD_RATE && rate <= MAX_USD_RATE;
}

/**
 * Dólares a colones, redondeado a colones enteros: acá no circulan los
 * céntimos y un saldo con decimales no se puede comparar con el banco.
 */
export function usdToCrc(amount: number, rate: number): number {
  if (!Number.isFinite(amount) || !isValidRate(rate)) return 0;
  return Math.round(amount * rate);
}

/** Para mostrar de dónde salió el monto: "USD 12,90 × 510". */
export function conversionLabel(amount: number, rate: number): string {
  const usd = amount.toLocaleString("es-CR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `USD ${usd} × ${rate.toLocaleString("de-DE")}`;
}
