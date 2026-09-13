import {
  crLocalToUtcIso,
  isPaypalRoutedMerchant,
  parseCRAmount,
  resolveTransactionDate,
  type EmailParser,
} from "./types";

/** Formato "21/07/2026 18:15:52" (hora de Costa Rica, 24h) -> ISO UTC, o null
 *  si el texto no matchea ese formato (nunca "ahora" — ver resolveTransactionDate). */
function parseDate(raw: string): string | null {
  const match = raw.match(/(\d{2})\/(\d{2})\/(\d{4})\s+(\d{1,2}):(\d{2}):(\d{2})/);
  if (!match) return null;
  const [, day, month, year, hour, minute, second] = match;
  return crLocalToUtcIso(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), Number(second));
}

/**
 * "Notificación de Transacciones BCR" (bcrtarjestcta@bancobcr.com): una
 * tabla de una sola fila, aplanada por el stripeo de HTML en dos bloques
 * separados — primero todos los encabezados de columna, después todos los
 * valores, en el mismo orden. Se leen por NOMBRE de columna (no por
 * posición fija): mientras el correo siga trayendo las columnas que
 * necesitamos (Fecha/Monto/Moneda/Comercio/Estado), no importa si BCR
 * agrega, saca o reordena alguna otra (ej. "Cuotas") — antes, un chequeo
 * estricto de "tienen que ser exactamente 7 valores" hacía que agregar una
 * sola columna nueva perdiera la transacción entera.
 */
export const parseBcrCardPurchase: EmailParser = (bodyText, { receivedAt }) => {
  if (!/SOMOS EL BANCO DE COSTA RICA/i.test(bodyText)) return null;

  // El bloque de encabezados empieza siempre en "Fecha" (primera columna) y
  // termina en "Estado" (última); el bloque de valores es todo lo que sigue
  // hasta el pie de página.
  const tableMatch = bodyText.match(
    /Fecha\s*\n([\s\S]*?)\nEstado\s*\n([\s\S]+?)\n(?:En caso de dudas)/i
  );
  if (!tableMatch) return null;

  const headers = ["Fecha", ...tableMatch[1].split("\n").map((s) => s.trim()).filter(Boolean), "Estado"];
  const values = tableMatch[2].split("\n").map((s) => s.trim()).filter(Boolean);
  if (headers.length !== values.length || headers.length === 0) return null;

  const row = new Map<string, string>();
  headers.forEach((header, i) => row.set(header.toLowerCase(), values[i]));

  const fecha = row.get("fecha");
  const monto = row.get("monto");
  const moneda = row.get("moneda");
  const comercio = row.get("comercio");
  const estado = row.get("estado");
  if (!fecha || !monto || !moneda || !comercio || !estado) return null;

  if (/negada|rechazada|denegada/i.test(estado)) return null;

  // Igual que en BAC/BP/Davivienda/BNCR/MUCAP: si la tarjeta pagó a través
  // de PayPal, ese cobro ya lo captura el parser de PayPal con el nombre
  // real del comercio — se ignora acá para no duplicarlo.
  if (isPaypalRoutedMerchant(comercio)) return null;

  return {
    bank_name: "BCR",
    amount: parseCRAmount(monto),
    currency: /USD|D[oó]LAR/i.test(moneda) ? "USD" : "CRC",
    description: comercio,
    type: "EXPENSE",
    transaction_date: resolveTransactionDate("bcrCardPurchase", fecha, parseDate(fecha), receivedAt),
  };
};
