import { crLocalToUtcIso, parseCRAmount, resolveTransactionDate, type EmailParser } from "./types";

/** Formato "22/07/2026 02:37:39 AM" (hora de Costa Rica) -> ISO UTC, o null
 *  si el texto no matchea ese formato (nunca "ahora" — ver resolveTransactionDate). */
function parseDate(raw: string): string | null {
  const match = raw.match(
    /(\d{2})\/(\d{2})\/(\d{4})\s+(\d{1,2}):(\d{2}):(\d{2})\s*(AM|PM)/i
  );
  if (!match) return null;
  const [, day, month, year, hourRaw, minute, second, ampm] = match;
  let hour = Number(hourRaw) % 12;
  if (ampm.toUpperCase() === "PM") hour += 12;
  return crLocalToUtcIso(Number(year), Number(month) - 1, Number(day), hour, Number(minute), Number(second));
}

/**
 * "Comprobante Pago de Servicios" de Banco Popular (pago de recibos: luz,
 * agua, etc.), viene en un PDF adjunto del correo "Notificación de Pago de
 * Servicios" de bancamovil@bpdc.fi.cr.
 */
export const parseBpServicePayment: EmailParser = (bodyText, { receivedAt }) => {
  if (!/Comprobante Pago de Servicios/i.test(bodyText)) return null;

  const empresa = bodyText.match(/Empresa:\s*([^\n]+)/i)?.[1]?.trim();
  const montoMatch = bodyText.match(/Monto Pagado:\s*[₡$]?\s*([\d,.]+)/i);
  const fecha = bodyText.match(/Fecha:\s*([^\n]+)/i)?.[1]?.trim();

  if (!empresa || !montoMatch) return null;

  return {
    bank_name: "BP",
    amount: parseCRAmount(montoMatch[1]),
    currency: "CRC",
    description: `Pago de servicios: ${empresa}`,
    type: "EXPENSE",
    transaction_date: resolveTransactionDate(
      "bpServicePayment",
      fecha,
      fecha ? parseDate(fecha) : null,
      receivedAt
    ),
  };
};
