import { crLocalToUtcIso, isPaypalRoutedMerchant, parseIntlAmount, type EmailParser } from "./types";

const MONTHS: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
};

/** Formato "Jul 22, 2026 - 10:28 p.m." (hora de Costa Rica) -> ISO UTC. */
function parseDate(monthAbbr: string, day: string, year: string, hourRaw: string, minute: string, ampm: string): string {
  const month = MONTHS[monthAbbr.toLowerCase()] ?? 0;
  let hour = Number(hourRaw) % 12;
  if (/^p/i.test(ampm)) hour += 12;
  return crLocalToUtcIso(Number(year), month, Number(day), hour, Number(minute));
}

/**
 * "Voucher Digital" del Banco Nacional (bncontacto@bncr.fi.cr): comprobante
 * de compra con tarjeta de crédito/débito. Las fechas vienen con nombres de
 * mes en inglés ("Jul 22, 2026"), a diferencia de los demás bancos.
 */
export const parseBnCardPurchase: EmailParser = (bodyText) => {
  if (!/Banco Nacional/i.test(bodyText) || !/comprobante de Compra/i.test(bodyText)) {
    return null;
  }

  const merchant = bodyText
    .match(/comprobante de Compra\s*realizada en\s+([\s\S]+?)\s+el\s+\d{1,2}\s+de/i)?.[1]
    ?.replace(/\s+/g, " ")
    .trim();
  const dateMatch = bodyText.match(
    /([A-Za-z]{3})\s+(\d{1,2}),\s+(\d{4})\s*-\s*(\d{1,2}):(\d{2})\s*(a\.m\.|p\.m\.)/i
  );
  const amountMatch = bodyText.match(/TOTAL:\s*\n?\s*(CRC|USD)\s*([\d.,]+)/i);

  if (!merchant || !dateMatch || !amountMatch) return null;

  // Igual que en BAC/BP/Davivienda: si la tarjeta pagó a través de PayPal,
  // ese cobro ya lo captura el parser de PayPal con el nombre real del
  // comercio — se ignora acá para no duplicarlo.
  if (isPaypalRoutedMerchant(merchant)) return null;

  const [, monthAbbr, day, year, hour, minute, ampm] = dateMatch;

  return {
    bank_name: "BNCR",
    amount: parseIntlAmount(amountMatch[2]),
    currency: amountMatch[1].toUpperCase() === "USD" ? "USD" : "CRC",
    description: merchant,
    type: "EXPENSE",
    transaction_date: parseDate(monthAbbr, day, year, hour, minute, ampm),
  };
};
