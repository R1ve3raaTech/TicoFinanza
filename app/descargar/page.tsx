import { statSync } from "node:fs";
import path from "node:path";
import type { Metadata } from "next";
import { APK_PATH, DownloadView } from "@/components/download/DownloadView";

export const metadata: Metadata = {
  title: "Descargar",
  description:
    "Instalá TicoFinanza en Android, iPhone o Windows, con su propio ícono y sin la barra del navegador.",
};

/**
 * Página pública de descarga.
 *
 * Cada archivo se ofrece **solo si está de verdad**. Un botón de descarga
 * que responde 404 deja a la persona creyendo que la app está rota, no que
 * todavía no publicamos el archivo; y es un error que nadie reporta,
 * porque parece culpa del dispositivo.
 *
 * Para publicarlo: ponerlo en `public/downloads/` con el nombre exacto
 * (ver APK_PATH) y volver a deployar. No hay que tocar nada más — el
 * botón aparece solo, con el tamaño real al lado. La ruta es estática,
 * así que la comprobación corre al construir, y cada deploy construye.
 */
function fileInfo(publicPath: string): { bytes: number } | null {
  try {
    // La ruta pública arranca con "/"; acá se resuelve contra `public/`,
    // que es de donde Next la sirve.
    const stat = statSync(path.join(process.cwd(), "public", publicPath));
    return stat.isFile() && stat.size > 0 ? { bytes: stat.size } : null;
  } catch {
    // No está, o no se puede leer. En los dos casos la respuesta correcta
    // es no ofrecer la descarga.
    return null;
  }
}

export default function DownloadPage() {
  return <DownloadView downloads={{ apk: fileInfo(APK_PATH) }} />;
}
