/**
 * Reconocer el error de "esa columna no existe" venga como venga.
 *
 * Importa porque es exactamente lo que devuelve la base cuando una
 * migración todavía no se corrió, y si no se reconoce, la app contesta "no
 * se pudo guardar" y nadie sabe que lo único que falta es un SQL.
 *
 * Llega de dos formas distintas según quién se queje primero:
 *
 * - **PostgREST** rechaza el escrito antes de tocar la base, porque la
 *   columna no está en su caché de esquema: código `PGRST204`, con un
 *   mensaje del tipo "Could not find the 'icon' column … in the schema
 *   cache". **Este es el caso normal** cuando se escribe desde la app.
 * - **Postgres** se queja él mismo: `42703`, "column … does not exist". Pasa
 *   cuando el escrito sí llega a la base.
 *
 * La primera versión de esto solo miraba `42703` —el error "de libro"— y por
 * eso el caso real pasaba de largo.
 */
export function isMissingColumnError(error: {
  code?: string | null;
  message?: string | null;
} | null): boolean {
  if (!error) return false;
  if (error.code === "42703" || error.code === "PGRST204") return true;
  const message = error.message ?? "";
  return /schema cache/i.test(message) || /column .* does not exist/i.test(message);
}

/**
 * Reconocer el error de "esa tabla no existe".
 *
 * Mismo problema que `isMissingColumnError` y misma razón de ser: es lo
 * que contesta la base cuando una migración que crea una tabla todavía no
 * se corrió, y sin reconocerlo la app dice "no se pudo" y nadie sabe que
 * lo único que falta es un SQL.
 *
 * Llega por dos lados, igual que el de columna: `PGRST205` cuando
 * PostgREST no la encuentra en su caché de esquema —el caso normal— y
 * `42P01` cuando la queja viene de Postgres.
 */
export function isMissingTableError(error: {
  code?: string | null;
  message?: string | null;
} | null): boolean {
  if (!error) return false;
  if (error.code === "42P01" || error.code === "PGRST205") return true;
  const message = error.message ?? "";
  return (
    /Could not find the table/i.test(message) ||
    /relation .* does not exist/i.test(message)
  );
}
