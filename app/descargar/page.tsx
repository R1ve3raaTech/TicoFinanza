import { statSync } from "node:fs";
import path from "node:path";
import type { Metadata } from "next";
import { APK_PATH, DownloadView } from "@/components/download/DownloadView";

export const metadata: Metadata = {
  title: "Descargar",
  description:
    "Instalá TicoFinanza en tu teléfono o en la compu: el archivo de Android, o la app desde el navegador con su propio ícono.",
};

/**
 * Página pública de descarga.
 *
 * El APK se ofrece **solo si el archivo está de verdad**. Un botón de
 * descarga que responde 404 deja a la persona creyendo que la app está
 * rota, no que todavía no publicamos el archivo; y es un error que nadie
 * reporta, porque parece culpa del teléfono.
 *
 * Para publicarlo: poner el archivo en `public/downloads/TicoFinanza.apk`
 * y volver a deployar. No hay que tocar nada más — el botón aparece solo,
 * con el tamaño real del archivo al lado.
 */
function apkInfo(): { bytes: number } | null {
  try {
    // APK_PATH arranca con "/" porque es la ruta pública; acá se resuelve
    // contra `public/`, que es de donde la sirve Next.
    const file = path.join(process.cwd(), "public", APK_PATH);
    const stat = statSync(file);
    return stat.isFile() && stat.size > 0 ? { bytes: stat.size } : null;
  } catch {
    // No está, o no se puede leer. En cualquiera de los dos casos la
    // respuesta correcta es no ofrecer la descarga.
    return null;
  }
}

export default function DownloadPage() {
  return <DownloadView apk={apkInfo()} />;
}
