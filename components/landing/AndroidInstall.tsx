import type { ReactNode } from "react";
import { AndroidLogo, DownloadSimple } from "@phosphor-icons/react/dist/ssr";
import { buttonClass } from "@/components/ui/Button";
import { APK_PATH, apkInfo, formatApkSize } from "@/lib/apk";

/**
 * Instalar en Android, dentro de la portada.
 *
 * Antes esto era una página aparte (`/descargar`) con una tarjeta por
 * plataforma: Android, iPhone y Windows. Se quedó solo Android porque es la
 * única donde hay un archivo que instalar; en iPhone Apple no permite
 * instalar por fuera de su tienda, y en Windows el paquete que generaba
 * PWABuilder no servía suelto. Dos tarjetas que no ofrecían ningún archivo
 * hacían ver la tercera, que sí, como una opción más entre varias.
 *
 * Y dejó de ser una página porque una página aparte hay que ir a buscarla:
 * acá está en el camino de quien ya está leyendo de qué se trata.
 *
 * **El botón solo existe si el archivo existe** (ver lib/apk.ts). El
 * servidor lo comprueba al generar la portada.
 */
const STEPS: { title: string; body: ReactNode }[] = [
  {
    title: "Descargar",
    body: 'Tocá el botón y confirmá la descarga en el navegador.',
  },
  {
    title: "Dar permiso",
    body: (
      <>
        Abrí el archivo descargado. Si Android muestra un aviso de seguridad, tocá{" "}
        <span className="text-ink">Ajustes</span> y activá{" "}
        <span className="text-ink">Permitir desde esta fuente</span>.
      </>
    ),
  },
  {
    title: "Instalar",
    body: 'Volvé atrás y tocá "Instalar". Queda con su ícono, como cualquier otra app.',
  },
];

export function AndroidInstall() {
  const apk = apkInfo();

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        <AndroidLogo size={22} weight="fill" aria-hidden className="shrink-0 text-ink-3" />
        {apk ? (
          <span className="flex flex-col gap-1">
            {/* Secundario y no primario: la acción principal de la portada
                sigue siendo entrar, y en esta app hay una sola acción
                primaria por pantalla. */}
            <a
              href={APK_PATH}
              download="TicoFinanza.apk"
              className={buttonClass({ variant: "secondary", size: "field" })}
            >
              <DownloadSimple size={16} />
              Descargar el APK
            </a>
            <span className="text-micro text-ink-3">{formatApkSize(apk.bytes)}</span>
          </span>
        ) : (
          <p className="text-meta leading-relaxed text-ink-3">
            El archivo todavía no está publicado. Mientras tanto la app funciona igual desde el
            navegador.
          </p>
        )}
      </div>

      {apk && (
        <ol className="flex flex-col gap-4 border-t border-line pt-6">
          {STEPS.map((step, i) => (
            <li key={step.title} className="flex gap-4">
              <span aria-hidden className="money w-5 shrink-0 text-meta text-ink-3">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-medium text-ink">{step.title}</span>
                <span className="mt-0.5 block text-meta leading-relaxed text-ink-2">
                  {step.body}
                </span>
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
