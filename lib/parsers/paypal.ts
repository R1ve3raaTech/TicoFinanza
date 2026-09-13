import { parseIntlAmount, type EmailParser } from "./types";

/**
 * Notificación de pago de PayPal (service@intl.paypal.com). El correo no
 * incluye la hora exacta de la compra (solo la fecha), así que se usa la
 * hora real de recepción del correo como respaldo.
 *
 * PayPal manda variantes distintas según el estado del pago: "Ha pagado"
 * cuando ya se cobró, y "Ha autorizado un pago" cuando queda pendiente de
 * que el comercio lo capture (común en compras dentro de apps/juegos vía
 * FastSpring y similares) — la tabla de detalles es la misma en ambas, así
 * que se acepta cualquiera de las dos en vez de solo la primera, que dejaba
 * esas compras sin registrar.
 *
 * Ese mismo caso (autorización + captura) puede generar DOS correos para el
 * mismo pago. El "Id. de transacción" se repite igual entre ambos avisos de
 * un mismo pago (confirmado contra correos reales), así que se guarda como
 * dedupeKey — quien llama (syncGmailForUser) lo usa para no insertar el
 * mismo pago dos veces. También se deja anotado dentro de la descripción
 * ("(ref. X)", mismo patrón que ya usa bacTransfer.ts) para no necesitar una
 * columna nueva en la base.
 *
 * Cuando PayPal convierte de colones a dólares se usa el monto original en
 * CRC ("Convertido desde") porque es lo que realmente salió de la cuenta o
 * tarjeta del usuario; si no hay conversión, se usa el total tal cual.
 */
export const parsePayPal: EmailParser = (bodyText, { receivedAt }) => {
  if (!/PayPal/i.test(bodyText) || !/Ha (pagado|autorizado un pago)/i.test(bodyText)) return null;

  const transactionId = bodyText.match(/Id\.\s*de transacci[oó]n\s*([A-Za-z0-9]+)/i)?.[1];
  if (!transactionId) return null;

  const merchant = bodyText.match(/Comercio\s*\n\s*([^\n]+)/i)?.[1]?.trim();
  const crcMatch = bodyText.match(/Convertido desde:\s*₡?\s*([\d.,]+)\s*CRC/i);
  // \b evita que "Subtotal" (mismo cuerpo, misma fila de la tabla, justo
  // arriba de "Total") matchee primero — sin el límite de palabra, "Total"
  // aparece como sufijo de "Subtotal" y esa era la fila que ganaba.
  // La moneda es cualquier código de 3 letras (PayPal no limita a USD/CRC:
  // puede mostrar el total en euros, libras, etc. según la cuenta).
  const totalMatch = bodyText.match(/\bTotal\s*\n?\s*[₡$€£]?\s*([\d.,]+)\s*([A-Z]{3})/i);

  if (!merchant || (!crcMatch && !totalMatch)) return null;

  const amount = parseIntlAmount(crcMatch ? crcMatch[1] : totalMatch![1]);
  const currency = crcMatch ? "CRC" : totalMatch![2].toUpperCase();

  return {
    bank_name: "PayPal",
    amount,
    currency,
    description: `${merchant} (ref. ${transactionId})`,
    type: "EXPENSE",
    transaction_date: receivedAt,
    dedupeKey: transactionId,
  };
};
