import type { ComponentType, ReactNode } from "react";
import Link from "next/link";
import {
  AndroidLogo,
  AppleLogo,
  ArrowLeft,
  DownloadSimple,
  WindowsLogo,
} from "@phosphor-icons/react/dist/ssr";
import { Logo } from "@/components/Logo";
import { buttonClass } from "@/components/ui/Button";
import { NativeInstallButton } from "./NativeInstallButton";

/** Ruta dentro de `public/`. Es la que sirve el navegador tal cual. */
export const APK_PATH = "/downloads/TicoFinanza.apk";

/**
 * Lo que el servidor averiguó del archivo. null = todavía no existe.
 *
 * Solo Android tiene descarga. Windows se instala desde la barra del
 * navegador, en un clic, y el paquete que PWABuilder genera para instalar
 * a mano no sirve suelto: necesita el .msix, un script y un .exe auxiliar
 * en la misma carpeta. En iPhone Apple no permite instalar por fuera de
 * su tienda.
 */
export interface Downloads {
  apk: { bytes: number } | null;
}

function formatSize(bytes: number): string {
  const mb = bytes / 1_000_000;
  if (mb >= 1) return `${mb.toFixed(1).replace(".", ",")} MB`;
  return `${Math.max(Math.round(bytes / 1000), 1)} KB`;
}

/**
 * Tarjeta de una plataforma. Todas tienen la misma forma —ícono, para qué
 * es, qué hacer, y los pasos— para que las tres se puedan comparar de un
 * vistazo en vez de leerse enteras.
 */
function PlatformCard({
  icon: Icon,
  title,
  subtitle,
  action,
  steps,
  footer,
}: {
  icon: ComponentType<{ size?: number; weight?: "fill"; className?: string }>;
  title: string;
  subtitle: string;
  action: ReactNode;
  steps: { title: string; body: ReactNode }[];
  footer?: ReactNode;
}) {
  return (
    <section
      aria-label={title}
      className="flex h-full flex-col rounded-surface border border-line bg-surface p-5 transition-colors duration-150 hover:border-line-strong"
    >
      <h2 className="flex items-center gap-2 text-label text-ink">
        <Icon size={17} weight="fill" className="shrink-0 text-ink-3" />
        {title}
      </h2>
      <p className="mt-1.5 text-meta leading-relaxed text-ink-3">{subtitle}</p>

      <div className="mt-4 flex flex-wrap items-start gap-2">{action}</div>

      <ol className="mt-5 flex flex-1 flex-col gap-3 border-t border-line pt-4">
        {steps.map((step, i) => (
          <li key={step.title} className="flex gap-3">
            <span aria-hidden className="money w-4 shrink-0 text-meta text-ink-3">
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

      {footer && <div className="mt-4 border-t border-line pt-3">{footer}</div>}
    </section>
  );
}

/** Enlace de descarga de un archivo que sí existe. */
function FileButton({
  href,
  name,
  bytes,
  label,
  primary,
}: {
  href: string;
  name: string;
  bytes: number;
  label: string;
  primary?: boolean;
}) {
  return (
    <span className="flex flex-col gap-1">
      <a
        href={href}
        download={name}
        className={buttonClass({ variant: primary ? "primary" : "secondary", size: "sm" })}
      >
        <DownloadSimple size={14} />
        {label}
      </a>
      <span className="text-micro text-ink-3">{formatSize(bytes)}</span>
    </span>
  );
}

/** Lo que se dice cuando el archivo todavía no se publicó. */
function NotPublished({ what }: { what: string }) {
  return (
    <p className="text-meta leading-relaxed text-ink-3">
      {what} todavía no está publicado. Los pasos de abajo funcionan igual y dejan la app con su
      propio ícono.
    </p>
  );
}

/**
 * Página de descarga, una tarjeta por plataforma.
 *
 * Los botones de archivo solo existen si el archivo existe (lo comprueba el
 * servidor, ver app/descargar/page.tsx). Una descarga que responde 404 deja
 * a la persona creyendo que la app está rota, y es un error que nadie
 * reporta porque parece culpa del teléfono.
 *
 * La instalación desde el navegador no se quitó de ninguna tarjeta: es la
 * única vía que existe en iPhone, y en Android y Windows es la que no pide
 * permisos raros.
 */
export function DownloadView({ downloads }: { downloads: Downloads }) {
  const { apk } = downloads;

  return (
    <main id="contenido" className="flex min-h-[100dvh] flex-col bg-ground text-ink">
      <header className="border-b border-line">
        <div className="mx-auto flex h-[68px] w-full max-w-5xl items-center gap-3 px-4 sm:px-6">
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

      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 py-12 sm:px-6">
        <h1 className="text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
          Descargá TicoFinanza
        </h1>
        <p className="mt-3 max-w-[58ch] text-base leading-relaxed text-ink-2">
          Elegí tu dispositivo. En todos queda con su propio ícono y sin la barra del navegador
          en el medio.
        </p>

        <div className="mt-10 grid gap-4 md:grid-cols-3">
          <PlatformCard
            icon={AndroidLogo}
            title="Android"
            subtitle="Teléfono o tableta con Android 8 o más nuevo."
            action={
              <>
                {apk ? (
                  <FileButton
                    href={APK_PATH}
                    name="TicoFinanza.apk"
                    bytes={apk.bytes}
                    label="Descargar APK"
                    primary
                  />
                ) : (
                  <NotPublished what="El archivo de instalación" />
                )}
                <NativeInstallButton label="Instalar desde el navegador" />
              </>
            }
            steps={
              apk
                ? [
                    {
                      title: "Descargar",
                      body: 'Tocá "Descargar APK" y confirmá la descarga en el navegador.',
                    },
                    {
                      title: "Dar permiso",
                      body: (
                        <>
                          Abrí el archivo descargado. Si Android muestra un aviso de seguridad,
                          tocá <span className="text-ink">Ajustes</span> y activá{" "}
                          <span className="text-ink">Permitir desde esta fuente</span>.
                        </>
                      ),
                    },
                    {
                      title: "Instalar",
                      body: 'Volvé atrás y tocá "Instalar" para terminar.',
                    },
                  ]
                : [
                    {
                      title: "Abrir en Chrome o Brave",
                      body: "Desde el teléfono, entrá a ticofinanza.com.",
                    },
                    {
                      title: "Abrir el menú",
                      body: "El de los tres puntos, arriba a la derecha.",
                    },
                    {
                      title: "Instalar app",
                      body: (
                        <>
                          Elegí <span className="text-ink">Instalar app</span> y confirmá.
                        </>
                      ),
                    },
                  ]
            }
            footer={
              apk ? (
                <p className="text-micro leading-relaxed text-ink-3">
                  El aviso de seguridad sale porque el archivo no viene de Google Play, no porque
                  haya algo malo. Si preferís evitarlo, instalala desde Chrome o Brave: menú de
                  tres puntos → Instalar app.
                </p>
              ) : undefined
            }
          />

          <PlatformCard
            icon={AppleLogo}
            title="iPhone y iPad"
            subtitle="Tiene que ser Safari: desde Chrome en iOS no se puede instalar."
            action={
              <p className="text-meta leading-relaxed text-ink-3">
                Apple no permite instalar apps por fuera de su tienda, así que acá va a mano. Son
                dos toques.
              </p>
            }
            steps={[
              {
                title: "Abrir en Safari",
                body: "Entrá a ticofinanza.com desde Safari, no desde otro navegador.",
              },
              {
                title: "Tocar Compartir",
                body: "Es el cuadrado con la flecha hacia arriba, abajo en la pantalla.",
              },
              {
                title: "Agregar a pantalla de inicio",
                body: (
                  <>
                    Elegí <span className="text-ink">Agregar a pantalla de inicio</span> y
                    confirmá con Agregar.
                  </>
                ),
              },
            ]}
            footer={
              <p className="text-micro leading-relaxed text-ink-3">
                Ojo con esto: los recordatorios en iPhone solo llegan si la app quedó instalada en
                la pantalla de inicio.
              </p>
            }
          />

          <PlatformCard
            icon={WindowsLogo}
            title="Windows"
            subtitle="Queda como programa, con su ventana y su ícono en el menú de inicio."
            action={
              <>
                {/* Sin archivo descargable a propósito: el paquete que se
                    instala a mano necesita el .msix, un script y un .exe
                    auxiliar en la misma carpeta, así que un archivo suelto
                    no instala nada. Desde la barra del navegador es un
                    clic y cero archivos. */}
                <NativeInstallButton label="Instalar TicoFinanza" />
                <p className="text-meta leading-relaxed text-ink-3">
                  Se instala desde el mismo navegador, en un clic. No hay que bajar ningún
                  archivo.
                </p>
              </>
            }
            steps={[
              {
                title: "Abrir en Chrome o Edge",
                body: "Entrá a ticofinanza.com desde cualquiera de los dos.",
              },
              {
                title: "Buscar el ícono de instalar",
                body: "Está en la barra de direcciones, a la derecha, junto a la estrella.",
              },
              {
                title: "Instalar",
                body: "Confirmá y se agrega al menú de inicio como cualquier programa.",
              },
            ]}
          />
        </div>

        <p className="mt-10 text-meta text-ink-3">
          ¿Ya la tenés? <Link href="/entrar">Entrar a tu cuenta</Link>.
        </p>
      </div>
    </main>
  );
}
