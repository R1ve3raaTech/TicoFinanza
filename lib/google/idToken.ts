/**
 * Lectura del claim `aud` de un id_token de Google, **sin verificar la
 * firma**.
 *
 * Eso suena peligroso y no lo es, porque de verificar se encarga Supabase
 * (`signInWithIdToken` comprueba firma, emisor, vencimiento y público). Esto
 * existe solo para poder escribir en el registro *por qué* falló: un token
 * dirigido a otro cliente de Google es un error de configuración que hay que
 * ir a arreglar, no un fallo pasajero que convenga reintentar.
 *
 * **Nunca sirve para decidir que un token es válido.** Cualquiera puede
 * escribir un JSON con el `aud` que quiera; lo que no puede es firmarlo.
 */
export function audienceOf(token: string): string | null {
  const partes = token.split(".");
  if (partes.length !== 3 || !partes[1]) return null;

  try {
    // base64url: Google usa `-` y `_` donde base64 usa `+` y `/`.
    const json = Buffer.from(
      partes[1].replace(/-/g, "+").replace(/_/g, "/"),
      "base64"
    ).toString("utf8");
    const aud = (JSON.parse(json) as { aud?: unknown }).aud;
    return typeof aud === "string" && aud ? aud : null;
  } catch {
    return null;
  }
}
