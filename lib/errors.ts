/**
 * El mensaje único para cuando algo se rompe.
 *
 * Antes cada acción tenía el suyo —uno por guardar un gasto fijo, otro por
 * copiar presupuestos, otro por activar recordatorios, y así treinta
 * veces—, y algunos dejaban escapar jerga que no significa nada para quien
 * la lee: un código de Postgres, el número de una migración.
 *
 * **La regla, para no volver a mezclarlos:**
 *
 * - Si la persona puede arreglarlo —un monto en cero, dos cuentas iguales,
 *   un código vencido, una categoría repetida— el mensaje **dice qué
 *   corregir**. Cambiarlo por "ups" convertiría un formulario que se
 *   arregla solo en uno que no se sabe por qué no pasa.
 * - Si se rompió algo del lado de la app —la base, la red, un permiso— la
 *   persona no tiene nada que hacer al respecto, y ahí va **este** mensaje.
 *   El detalle de verdad se escribe en el registro del servidor con
 *   `logFailure`, que es donde sirve.
 *
 * El 404 queda aparte: tiene su propia pantalla (app/not-found.tsx), que
 * explica que el enlace está viejo y ofrece a dónde ir.
 */
export const GENERIC_ERROR =
  "Ups, hubo un error al hacer esto. Reintentalo, y si no funciona, comunicate con el equipo de TicoFinanza (info@ticofinanza.com).";

/** Lo mismo, partido en dos para las pantallas que lo muestran grande. */
export const GENERIC_ERROR_TITLE = "Ups, hubo un error al hacer esto.";
export const GENERIC_ERROR_HELP =
  "Reintentalo, y si no funciona, comunicate con el equipo de TicoFinanza (info@ticofinanza.com).";

/**
 * Deja el motivo real en el registro del servidor.
 *
 * La persona ve `GENERIC_ERROR`; acá queda qué pasó de verdad, con el
 * nombre de la acción adelante para poder encontrarlo. Sin esto, unificar
 * los mensajes sería cambiar un error confuso por uno invisible — que es
 * justo lo que pasó con el guardado de categorías: fallaba y no había de
 * dónde agarrarse.
 */
export function logFailure(context: string, detail: unknown): void {
  console.error(`[TicoFinanza] ${context}:`, detail);
}
