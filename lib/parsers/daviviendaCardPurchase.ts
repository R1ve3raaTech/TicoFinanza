import { crLocalToUtcIso, isPaypalRoutedMerchant, parseCRAmount, type EmailParser } from "./types";

/** Formato "19/07/2026 a las 12:39 PM" (hora de Costa Rica) -> ISO UTC. */
function parseDaviviendaDate(
  day: string,
  month: string,
  year: string,
  hourRaw: string,
  minute: string,
  ampm: string
): string {
  let hour = Number(hourRaw) % 12;
  if (ampm.toUpperCase() === "PM") hour += 12;
  return crLocalToUtcIso(Number(year), Number(month) - 1, Number(day), hour, Number(minute));
}

/**
 * Notificación de compra con tarjeta de DAVIbank (Davivienda Costa Rica,
 * alertas@davibank.cr): "la transacción realizada en [comercio] Costa
 * Rica, el día [fecha] a las [hora] con su tarjeta... por [moneda] [monto],
 * fue aprobada."
 */
export const parseDaviviendaCardPurchase: EmailParser = (bodyText) => {
  if (!/DAVIbank le notifica/i.test(bodyText)) return null;

  const merchant = bodyText
    .match(/realizada en\s+([\s\S]+?)\s+Costa Rica,\s*el d[ií]a/i)?.[1]
    ?.trim()
    .replace(/\s+/g, " ");
  const dateMatch = bodyText.match(
    /el d[ií]a\s*(\d{2})\/(\d{2})\/(\d{4})\s*a las\s*(\d{1,2}):(\d{2})\s*(AM|PM)/i
  );
  const amountMatch = bodyText.match(/por\s+(CRC|USD)\s*([\d,.]+),?\s*fue aprobada/i);

  if (!merchant || !dateMatch || !amountMatch) return null;

  // Las compras pagadas con PayPal aparecen en el estado de cuenta como
  // "PAYPAL *comercio" o, más seguido, con la abreviatura de red de tarjeta
  // "PP*comercio": ya las captura el parser de PayPal con el nombre real del
  // comercio, así que se ignoran acá para no duplicar el gasto. Antes esto
  // solo miraba /paypal/i (no reconocía "PP*x"), a diferencia de BAC y BP —
  // mismo helper compartido para que la señal sea idéntica en todos los
  // bancos, no una guardia distinta por banco.
  if (isPaypalRoutedMerchant(merchant)) return null;

  const [, day, month, year, hour, minute, ampm] = dateMatch;
  const [, currencyRaw, amountRaw] = amountMatch;

  return {
    bank_name: "Davivienda",
    amount: parseCRAmount(amountRaw),
    currency: currencyRaw.toUpperCase() === "USD" ? "USD" : "CRC",
    description: merchant,
    type: "EXPENSE",
    transaction_date: parseDaviviendaDate(day, month, year, hour, minute, ampm),
  };
};
