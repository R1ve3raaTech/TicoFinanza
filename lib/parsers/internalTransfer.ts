import type { EmailParser } from "./types";

/**
 * Comprobante de "Transferencia Banca Móvil" de Banco Popular
 * (bancamovil@bpdc.fi.cr): mover plata entre sobres/cuentas propias, ej. a
 * "Ahorro". BP manda un solo correo con origen y destino.
 *
 * Estado real (revisado contra la bandeja real de un usuario, más de 200
 * correos de bpdc.fi.cr/bancopopularinforma.fi.cr): no apareció NINGÚN
 * correo con el asunto/frase "Comprobante de Transferencia Banca Móvil" que
 * este parser busca. Lo que sí existe y es frecuente es "Comprobante de
 * transacción SINPE" (sinpeMovil.ts) — ESE formato ya cubre bien las
 * transferencias a otra persona, self incluido, confirmado con correos
 * reales. Y "Notificación de transferencia BPDC" (bancamovil@bpdc.fi.cr, un
 * PDF adjunto sin nada en el cuerpo del correo) parece ser el que de verdad
 * dispara la extracción de texto del PDF en lib/google/gmail.ts, pero no se
 * pudo confirmar su contenido real (la app no tiene forma de leer PDFs
 * fuera de la sincronización real).
 *
 * Por eso NO se implementa acá una detección de "transferencia a otra
 * persona" a partir de un formato que no se pudo confirmar — inventarlo
 * arriesga clasificar mal una transacción real. Lo único que se mantiene es
 * el caso ya confirmado y su razón de ser: si algún día llega un correo con
 * ese asunto exacto y origen === destino (mover plata entre cuentas propias,
 * el dinero no salió del usuario), no debe registrarse ni como ingreso ni
 * como gasto.
 */
export const parseInternalTransfer: EmailParser = (bodyText) => {
  if (!/Comprobante de Transferencia Banca M[oó]vil/i.test(bodyText)) return null;

  const nombreOrigen = bodyText
    .match(/Origen[\s\S]*?A nombre de:\s*([^\n]+)/i)?.[1]
    ?.trim()
    .toLowerCase();
  const nombreDestino = bodyText
    .match(/Destino[\s\S]*?A nombre de:\s*([^\n]+)/i)?.[1]
    ?.trim()
    .toLowerCase();

  if (nombreOrigen && nombreDestino && nombreOrigen === nombreDestino) {
    // Movimiento entre cuentas propias del usuario: no es un ingreso ni un
    // gasto real, se ignora a propósito.
    return null;
  }

  // Mismo formato pero a nombre de otra persona: sin un correo real de este
  // caso confirmado (ver comentario de arriba), se deja sin manejar en vez
  // de adivinar la estructura. Si el asunto exacto llega a aparecer alguna
  // vez, avisa acá para no perderlo en silencio otra vez.
  if (nombreOrigen && nombreDestino) {
    console.warn(
      "[internalTransfer] correo real de 'Comprobante de Transferencia Banca Móvil' a un tercero — formato nunca confirmado, revisar y completar este parser"
    );
  }
  return null;
};
