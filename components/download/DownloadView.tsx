import Link from "next/link";
import { AndroidLogo, ArrowLeft, DownloadSimple } from "@phosphor-icons/react/dist/ssr";
import { Logo } from "@/components/Logo";
import { buttonClass } from "@/components/ui/Button";
import { PwaInstall } from "./PwaInstall";

/** Ruta del archivo dentro de `public/`. Es la que sirve el navegador. */
export const APK_PATH = "/downloads/TicoFinanza.apk";

const STEPS = [
  {
    title: "Descargar",
    body: 'Tocá "Descargar APK" y confirmá la descarga en el navegador.',
  },
  {
    title: "Dar permiso",
    body: 'Abrí el archivo descargado. Si Android te muestra un aviso de seguridad, tocá "Ajustes" y activá "Permitir desde esta fuente".',
  },
  {
    title: "Instalar",
    body: 'Volvé atrás y tocá "Instalar" para terminar.',
  },
];

/**
 * Página de descarga.
 *
 * El botón del APK solo existe si el archivo existe (lo comprueba el
 * servidor, ver app/descargar/page.tsx). Un botón de descarga que da 404
 * es peor que no tener botón: deja a la persona creyendo que la app está
 * rota, no que todavía no publicamos el archivo.
 *
 * La instalación sin APK no se quitó. El APK es solo para Android; en
 * iPhone y en computadora es la única forma que hay.
 */
export function DownloadView({
  apk,
}: {
  /** Tamaño del APK en bytes, o null si todavía no está publicado. */
  apk: { bytes: number } | null;
}) {
  return (
    <main id="contenido" className="flex min-h-[100dvh] flex-col bg-ground text-ink">
      <header className="border-b border-line">
        <div className="mx-auto flex h-[68px] w-full max-w-2xl items-center gap-3 px-4 sm:px-6">
          <Link
            href="/"
            aria-label="Volver al inicio"
            className="flex h-8 w-8 items-center justify-center rounded-full text-ink-2 transition-colors hover:bg-surface hover:text-ink"
          >
            <ArrowLeft size={18} weight="bold" />
          </Link>
          <Logo />
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 py-12 sm:px-6">
        <h1 className="text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
          Descargá TicoFinanza
        </h1>
        <p className="mt-3 max-w-[58ch] text-base leading-relaxed text-ink-2">
          Para tenerla con su propio ícono, sin la barra del navegador en el medio.
        </p>

        {apk ? (
          <>
            <section aria-labelledby="android-titulo" className="mt-10">
              <h2 id="android-titulo" className="flex items-center gap-2 text-label text-ink">
                <AndroidLogo size={16} aria-hidden className="text-ink-3" />
                Android
              </h2>
              <div className="mt-3">
                <a
                  href={APK_PATH}
                  download="TicoFinanza.apk"
                  className={buttonClass({ variant: "primary" })}
                >
                  <DownloadSimple size={15} />
                  Descargar APK
                </a>
                <p className="mt-2 text-meta text-ink-3">
                  {formatSize(apk.bytes)} · Android 8 o más nuevo
                </p>
              </div>
            </section>

            <section aria-labelledby="pasos-titulo" className="mt-8">
              <h2 id="pasos-titulo" className="text-label text-ink">
                Cómo instalarlo
              </h2>
              <ol className="mt-3 flex flex-col gap-4 rounded-surface border border-line bg-surface p-5">
                {STEPS.map((step, i) => (
                  <li key={step.title} className="flex gap-4">
                    <span
                      aria-hidden
                      className="money mt-0.5 w-5 shrink-0 text-label text-ink-3"
                    >
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-label text-ink">{step.title}</span>
                      <span className="mt-0.5 block max-w-[52ch] text-sm leading-relaxed text-ink-2">
                        {step.body}
                      </span>
                    </span>
                  </li>
                ))}
              </ol>
              {/* Decirlo antes y no después: el aviso de Android asusta, y
                  quien no sabe por qué sale, abandona ahí. */}
              <p className="mt-3 max-w-[58ch] text-meta leading-relaxed text-ink-3">
                El aviso de seguridad sale porque el archivo no viene de Google Play, no porque
                haya algo malo. Es el mismo paso para cualquier app instalada por fuera de la
                tienda.
              </p>
            </section>
          </>
        ) : (
          <section aria-labelledby="pendiente-titulo" className="mt-10">
            <h2 id="pendiente-titulo" className="flex items-center gap-2 text-label text-ink">
              <AndroidLogo size={16} aria-hidden className="text-ink-3" />
              Android
            </h2>
            <p className="mt-2 max-w-[58ch] text-sm leading-relaxed text-ink-2">
              El archivo para instalar todavía no está publicado. Mientras tanto, abajo está la
              forma de ponerla en tu pantalla de inicio: queda igual, con su ícono y sin la barra
              del navegador.
            </p>
          </section>
        )}

        <section aria-labelledby="pwa-titulo" className="mt-10 border-t border-line pt-8">
          <h2 id="pwa-titulo" className="text-label text-ink">
            {apk ? "iPhone, computadora o sin instalar nada" : "Ponerla en la pantalla de inicio"}
          </h2>
          <p className="mt-2 max-w-[58ch] text-sm leading-relaxed text-ink-2">
            Funciona en cualquier teléfono y en la compu. Es la misma app, con su ícono propio.
          </p>
          <div className="mt-4">
            <PwaInstall />
          </div>
        </section>

        <p className="mt-10 text-meta text-ink-3">
          ¿Ya la tenés? <Link href="/entrar">Entrar a tu cuenta</Link>.
        </p>
      </div>
    </main>
  );
}

function formatSize(bytes: number): string {
  const mb = bytes / 1_000_000;
  if (mb >= 1) return `${mb.toFixed(1).replace(".", ",")} MB`;
  return `${Math.max(Math.round(bytes / 1000), 1)} KB`;
}
