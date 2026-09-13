import {
  crLocalToUtcIso,
  isPaypalRoutedMerchant,
  parseCRAmount,
  resolveTransactionDate,
  type EmailParser,
} from "./types";

const MONTHS: Record<string, number> = {
  ene: 0, feb: 1, mar: 2, abr: 3, may: 4, jun: 5,
  jul: 6, ago: 7, sep: 8, oct: 9, nov: 10, dic: 11,
};

/** Formato "Jul. 20, 2026, 21:11" (hora de Costa Rica) -> ISO UTC, o null si
 *  el texto no matchea ese formato (nunca "ahora" — ver resolveTransactionDate). */
function parseCardDate(raw: string): string | null {
  const match = raw.match(/(\w{3})\.?\s*(\d{1,2}),\s*(\d{4}),\s*(\d{1,2}):(\d{2})/);
  if (!match) return null;
  const [, monthAbbr, day, year, hour, minute] = match;
  const month = MONTHS[monthAbbr.toLowerCase()] ?? 0;
  return crLocalToUtcIso(Number(year), month, Number(day), Number(hour), Number(minute));
}

/**
 * Notificación de compra con tarjeta (débito/crédito) de BAC Credomatic
 * (notificacion@notificacionesbaccr.com): tabla clave-valor Comercio /
 * Ciudad y país / Fecha / Visa / Autorización / Referencia / Tipo de
 * Transacción / Monto. El monto puede venir en CRC, USD o NIC (compras
 * hechas en Nicaragua con la misma tarjeta) — se devuelve la moneda cruda
 * tal cual, la conversión a colones pasa después en parseEmail().
 *
 * Este layout ("Comprobante de Compra" con esa misma tabla de campos) no es
 * exclusivo de BAC: Banco Popular manda notificaciones de compra con la
 * tabla idéntica (ver bpCardPurchase.ts), y sin este chequeo cualquier
 * correo de BP con ese formato se registraba como si fuera de BAC — pasó de
 * verdad con una compra real (confirmado corriendo el parser contra el
 * correo). Por eso hace falta algo que solo aparezca en el correo real de
 * BAC (el pie de página, no la tabla de arriba que ambos comparten).
 */
export const parseBacCardPurchase: EmailParser = (bodyText, { receivedAt }) => {
  if (!/baccredomatic\.com|BAC INTERNATIONAL BANK/i.test(bodyText)) return null;

  const comercio = bodyText.match(/Comercio:\s*([^\n]+)/i)?.[1]?.trim();
  const fecha = bodyText.match(/Fecha:\s*([^\n]+)/i)?.[1]?.trim();
  const tipo = bodyText.match(/Tipo de Transacci[oó]n:\s*([^\n]+)/i)?.[1]?.trim();
  const montoMatch = bodyText.match(/Monto:\s*(CRC|USD|NIC|₡|\$)\s*([\d,.]+)/i);

  if (!comercio || !montoMatch || !/COMPRA/i.test(tipo ?? "")) return null;

  // Las compras pagadas con PayPal aparecen en el estado de cuenta como
  // "PAYPAL *comercio" o "PP*comercio": ya las captura el parser de PayPal
  // con el nombre real del comercio, así que se ignoran acá para no
  // duplicar el gasto.
  if (isPaypalRoutedMerchant(comercio)) return null;

  const [, currencyRaw, amountRaw] = montoMatch;
  const currency = /NIC/i.test(currencyRaw) ? "NIO" : /USD|\$/i.test(currencyRaw) ? "USD" : "CRC";

  return {
    bank_name: "BAC",
    amount: parseCRAmount(amountRaw),
    currency,
    description: comercio,
    type: "EXPENSE",
    transaction_date: resolveTransactionDate(
      "bacCardPurchase",
      fecha,
      fecha ? parseCardDate(fecha) : null,
      receivedAt
    ),
  };
};
