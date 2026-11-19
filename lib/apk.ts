import "server-only";
import { statSync } from "node:fs";
import path from "node:path";

/** Ruta dentro de `public/`. Es la que sirve el navegador tal cual. */
export const APK_PATH = "/downloads/TicoFinanza.apk";

/**
 * Lo que el servidor averiguó del archivo. `null` = todavía no existe.
 *
 * El botón de descarga **solo se dibuja si el archivo está de verdad**. Una
 * descarga que responde 404 deja a la persona creyendo que la app está
 * rota, no que todavía no publicamos el archivo; y es un error que nadie
 * reporta, porque parece culpa del teléfono.
 *
 * Para publicar una versión nueva: dejarla en `public/downloads/` con este
 * mismo nombre y volver a deployar. No hay que tocar nada más — el botón
 * aparece solo, con el tamaño real al lado.
 */
export function apkInfo(): { bytes: number } | null {
  try {
    // La ruta pública arranca con "/"; acá se resuelve contra `public/`,
    // que es de donde Next la sirve.
    const stat = statSync(path.join(process.cwd(), "public", APK_PATH));
    return stat.isFile() && stat.size > 0 ? { bytes: stat.size } : null;
  } catch {
    // No está, o no se puede leer. En los dos casos la respuesta correcta
    // es no ofrecer la descarga.
    return null;
  }
}

export function formatApkSize(bytes: number): string {
  const mb = bytes / 1_000_000;
  if (mb >= 1) return `${mb.toFixed(1).replace(".", ",")} MB`;
  return `${Math.max(Math.round(bytes / 1000), 1)} KB`;
}
