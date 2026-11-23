import type { ReactNode } from "react";
import {
  AndroidLogo,
  AppleLogo,
  DownloadSimple,
  Export,
  PlusSquare,
} from "@phosphor-icons/react/dist/ssr";
// El tipo sale de la entrada principal porque `/dist/ssr` no lo exporta.
// Es `import type`, así que no arrastra nada al bundle.
import type { Icon } from "@phosphor-icons/react";
import { buttonClass } from "@/components/ui/Button";
import { APK_PATH, apkInfo, formatApkSize } from "@/lib/apk";

/**
 * Cómo instalar la app, dentro de la portada.
 *
 * ### Por qué vuelven a ser dos tarjetas
 *
 * Esto fue una página aparte (`/descargar`) con tres tarjetas —Android,
 * iPhone y Windows— y se redujo a Android sola, con un motivo escrito: dos
 * tarjetas que no ofrecían ningún archivo hacían ver la tercera, que sí lo
 * tiene, como una opción más entre varias.
 *
 * **Ese motivo ya no aplica, y por eso vuelve iPhone.** La diferencia es
 * que ahora las dos tarjetas son caminos reales: en Android se baja un
 * archivo, y en iPhone se agrega a la pantalla de inicio, que **no es
 * "usarlo desde el navegador"** — queda a pantalla completa, con su ícono,
 * su propia entrada en el selector de apps, su sesión aparte y el modo sin
 * conexión. Nadie elige entre las dos: elige el teléfono que tenga.
 *
 * Windows no vuelve: ahí sigue sin haber un archivo que ofrecer.
 *
 * ### Los íconos de los pasos no son adorno
 *
 * Cada paso que nombra un botón de verdad lo muestra con **su glifo**, el
 * mismo que ella va a estar buscando en su pantalla. El de Compartir de
 * iOS es un cuadrado con una flecha hacia arriba, y dicho con palabras no
 * se encuentra; dibujado, sí.
 *
 * **El botón de Android solo existe si el archivo existe** (ver
 * `lib/apk.ts`). El servidor lo comprueba al generar la portada.
 */

interface Step {
  title: string;
  body: ReactNode;
}

/** Un botón de la interfaz del teléfono, nombrado y dibujado. */
function Key({ icon: Icon, children }: { icon: Icon; children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-[0.3rem] border border-line bg-surface-raised px-1.5 py-0.5 align-baseline text-ink">
      <Icon size={13} aria-hidden className="shrink-0" />
      {children}
    </span>
  );
}

const ANDROID_STEPS: Step[] = [
  { title: "Descargar", body: "Tocá el botón y confirmá la descarga en el navegador." },
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

const IPHONE_STEPS: Step[] = [
  {
    title: "Abrir en Safari",
    body: (
      <>
        Entrá a <span className="text-ink">ticofinanza.com</span> desde Safari. Tiene que ser
        Safari: desde adentro de otra app el menú de abajo no aparece.
      </>
    ),
  },
  {
    title: "Compartir",
    body: (
      <>
        Tocá <Key icon={Export}>Compartir</Key> en la barra de abajo.
      </>
    ),
  },
  {
    title: "Agregar a inicio",
    body: (
      <>
        Bajá en la lista y tocá <Key icon={PlusSquare}>Agregar a pantalla de inicio</Key>.
      </>
    ),
  },
];

export function InstallSection() {
  const apk = apkInfo();

  return (
    <div className="grid gap-x-10 gap-y-12 md:grid-cols-2">
      <Platform
        icon={AndroidLogo}
        name="Android"
        lead="Se baja un archivo y se instala, sin pasar por ninguna tienda."
        action={
          apk ? (
            /* Secundario y no primario: la acción principal de la portada
               sigue siendo entrar, y en esta app hay una sola acción
               primaria por pantalla. */
            <span className="flex flex-col gap-1">
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
              El archivo todavía no está publicado.
            </p>
          )
        }
        steps={apk ? ANDROID_STEPS : []}
      />

      <Platform
        icon={AppleLogo}
        name="iPhone y iPad"
        lead="Se agrega desde Safari en tres toques. No hay archivo que bajar."
        steps={IPHONE_STEPS}
      />
    </div>
  );
}

function Platform({
  icon: Icon,
  name,
  lead,
  action,
  steps,
}: {
  icon: Icon;
  name: string;
  lead: string;
  action?: ReactNode;
  steps: Step[];
}) {
  return (
    <section className="flex flex-col gap-6">
      <div className="flex items-start gap-3">
        <Icon size={24} weight="fill" aria-hidden className="mt-0.5 shrink-0 text-ink-3" />
        <div className="min-w-0">
          <h3 className="text-heading text-ink">{name}</h3>
          <p className="mt-1 text-meta leading-relaxed text-ink-2">{lead}</p>
        </div>
      </div>

      {action ? (
        <div className="md:min-h-[4.25rem]">{action}</div>
      ) : (
        /* El hueco que alinea las dos columnas existe solo desde `md`, que
           es cuando están lado a lado. Apiladas no hay nada que alinear y
           un div vacío igual se lleva su `gap`: en teléfono eso era un
           espacio muerto antes de la divisoria de iPhone. */
        <div aria-hidden className="hidden md:block md:min-h-[4.25rem]" />
      )}

      {steps.length > 0 && (
        <ol className="flex flex-col gap-4 border-t border-line pt-6">
          {steps.map((step, i) => (
            <li key={step.title} className="flex gap-4">
              {/* Numeración editorial, el mismo lenguaje que "Cómo funciona"
                  más arriba en la portada. */}
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
    </section>
  );
}
