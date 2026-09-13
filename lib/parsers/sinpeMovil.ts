import { crLocalToUtcIso, parseCRAmount, resolveTransactionDate, type EmailParser } from "./types";

/** Formato "20/07/2026 09:05:58 PM" (hora de Costa Rica) -> ISO UTC, o null
 *  si el texto no matchea ese formato (nunca "ahora" — ver resolveTransactionDate). */
function parseSinpeDate(raw: string): string | null {
  const match = raw.match(
    /(\d{2})\/(\d{2})\/(\d{4})\s+(\d{1,2}):(\d{2}):(\d{2})\s*(AM|PM)/i
  );
  if (!match) return null;
  const [, day, month, year, hourRaw, minute, second, ampm] = match;
  let hour = Number(hourRaw) % 12;
  if (ampm.toUpperCase() === "PM") hour += 12;
  return crLocalToUtcIso(
    Number(year),
    Number(month) - 1,
    Number(day),
    hour,
    Number(minute),
    Number(second)
  );
}

/**
 * Comprobante de transferencia SINPE Móvil de Banco Popular
 * (BPNotifica@bpdc.fi.cr, tabla "Transacción SINPE"). BP tiene al menos dos
 * plantillas para el mismo tipo de correo: la de "enviado" trae "Monto
 * Enviado"; la de "recibido" usa "Monto Neto" en su lugar (ambas traen
 * "Tipo de Movimiento" en los correos reales confirmados, pero la
 * dirección igual se decide primero por ese campo si existe, y si no por
 * la frase de introducción "ha recibido" vs "ha transferido", por si algún
 * formato viejo no lo trae).
 *
 * El gate de acá abajo (¿por qué exigir "Banco Popular"/"bp.fi.cr" además
 * de "SINPE Móvil"?) es la misma clase de fix que ya tuvo bacCardPurchase.ts
 * contra Banco Popular: "Transacción SINPE" a secas también aparece en el
 * correo de BCR (bcrSinpe.ts), así que sin una señal propia de BP este
 * parser corría el mismo riesgo — hoy no se lo roba a BCR solo porque los
 * nombres de campo (Monto Enviado/Neto vs Monto) no coinciden, una
 * protección accidental, no un gate real. bcrSinpe.ts sí exige "MÓVIL" en
 * la frase; acá se agrega esa misma exigencia más una señal explícita del
 * banco, verificada contra correos reales de BP (tanto "enviado" como
 * "recibido" traen las dos cosas).
 */
export const parseSinpeMovil: EmailParser = (bodyText, { receivedAt }) => {
  // Tres señales por separado, no una frase pegada: en el correo real de BP
  // "Transacción SINPE" (el título de la tabla) y "SINPE Móvil" (en la
  // frase de arriba y en "Servicio SINPE: Sinpe Móvil") no aparecen
  // adyacentes, así que exigirlas como una sola frase no matchea nada real.
  if (!/Transacci[oó]n SINPE/i.test(bodyText)) return null;
  if (!/SINPE M[oó]vil/i.test(bodyText)) return null;
  if (!/Banco Popular|bp\.fi\.cr/i.test(bodyText)) return null;

  const movimiento = bodyText.match(/Tipo de Movimiento:\s*([^\n]+)/i)?.[1]?.trim();
  const monto =
    bodyText.match(/Monto Enviado:\s*([\d,.]+)/i)?.[1] ??
    bodyText.match(/Monto Neto:\s*([\d,.]+)/i)?.[1];
  const moneda = bodyText.match(/Moneda:\s*([A-Z]{3})/i)?.[1]?.toUpperCase();
  const fecha = bodyText.match(/Fecha:\s*([^\n]+)/i)?.[1]?.trim();
  const nombreOrigen = bodyText.match(/Nombre Origen:\s*([^\n]+)/i)?.[1]?.trim();
  const nombreDestino = bodyText.match(/Nombre Destino:\s*([^\n]+)/i)?.[1]?.trim();

  if (!monto) return null;

  const income = movimiento
    ? /cr[eé]dito/i.test(movimiento)
    : /ha recibido/i.test(bodyText);

  return {
    bank_name: "BP",
    amount: parseCRAmount(monto),
    currency: moneda === "USD" ? "USD" : "CRC",
    description: income
      ? `SINPE Móvil de ${nombreOrigen ?? "desconocido"}`
      : `SINPE Móvil a ${nombreDestino ?? "desconocido"}`,
    type: income ? "INCOME" : "EXPENSE",
    transaction_date: resolveTransactionDate(
      "sinpeMovil",
      fecha,
      fecha ? parseSinpeDate(fecha) : null,
      receivedAt
    ),
  };
};
