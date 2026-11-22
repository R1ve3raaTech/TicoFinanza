"use client";

import { useRef, type ComponentType, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  BookOpen,
  CaretRight,
  DownloadSimple,
  BellSimple,
  LockKey,
  Palette,
  Printer,
  Tag,
  User,
  Warning,
  type IconProps,
} from "@phosphor-icons/react";
import { useIsApp } from "@/components/app/AppModeProvider";
import { buttonClass } from "@/components/ui/Button";
import type { Theme } from "@/lib/types";
import { AppGuide } from "./AppGuide";
import { AppLockSetting } from "./AppLockSetting";
import { CategoryPanel } from "./CategoryPanel";
import { DangerZone } from "./DangerZone";
import { DeleteAccountFlow } from "./DeleteAccountFlow";
import { NotificationReader } from "./NotificationReader";
import { ProfileSettings } from "./ProfileSettings";
import { RemindersSetting } from "./RemindersSetting";
import { SessionSettings } from "./SessionSettings";
import { SettingsRow } from "./SettingsSection";
import { ThemeSetting } from "./ThemeSetting";
import type { SettingsData } from "./types";

/**
 * Ajustes, de vuelta como pantalla y con un índice.
 *
 * ### Por qué dejó de ser un diálogo
 *
 * Como diálogo eran ocho bloques apilados con mucho scroll: llegar a
 * cerrar sesión o a la zona de peligro costaba, todos los bloques pesaban
 * igual, y las filas eran un rótulo y un control sin nada más. En una
 * ventana chica eso se nota el doble, porque el scroll es más corto.
 *
 * ### La forma: índice y panel
 *
 * Una sola idea en los dos tamaños, que es lo que hace que se entienda sin
 * aprender nada:
 *
 * - **En teléfono** se ve el índice, y al tocar una entrada se ve esa
 *   sección sola, con una flecha para volver. Cada pantalla es corta.
 * - **Desde `lg`** el índice se queda a la izquierda y la sección a la
 *   derecha, las dos a la vista.
 *
 * **La sección elegida vive en la URL** (`?s=perfil`) y no en el estado
 * del cliente: así el botón de atrás del teléfono vuelve al índice en vez
 * de salirse de Ajustes, y un enlace a una sección concreta se puede
 * compartir o guardar.
 *
 * ### Las entradas dicen cuánto valen
 *
 * Cada una muestra su valor actual —el tema puesto, cuántas categorías
 * propias hay, si los avisos están activados—. Es lo que convierte el
 * índice en algo que se lee de un vistazo en vez de una lista de puertas
 * iguales: la mitad de las veces uno entra a Ajustes solo a comprobar un
 * valor, y así ni hace falta entrar.
 */

interface Seccion {
  id: string;
  label: string;
  icon: ComponentType<IconProps>;
  /** El valor actual, para leerlo sin entrar. */
  valor?: string;
  /** Lo destructivo se pinta distinto y va al final. */
  danger?: boolean;
  panel: ReactNode;
}

const TEMA: Record<Theme, string> = {
  light: "Claro",
  dark: "Oscuro",
  system: "Según el sistema",
};

export function SettingsScreen({ data }: { data: SettingsData }) {
  const isApp = useIsApp();
  const pathname = usePathname();
  const params = useSearchParams();
  const elegida = params.get("s");

  // Lo que el perfil deja acá para mandar lo pendiente al salir del campo.
  // En la pantalla no hay botón de "guardar y salir": cada campo se guarda
  // al dejarlo, así que esto solo existe para que el componente lo use.
  const flushRef = useRef<(() => Promise<boolean>) | null>(null);

  const propias = data.categories.length;

  const secciones: Seccion[] = [
    {
      id: "perfil",
      label: "Perfil",
      icon: User,
      valor: data.fullName || "Sin nombre",
      panel: (
        <ProfileSettings
          userId={data.userId}
          initialFullName={data.fullName}
          initialBirthDate={data.birthDate}
          initialAvatarUrl={data.avatarUrl}
          flushRef={flushRef}
        />
      ),
    },
    {
      id: "guia",
      label: "Guía",
      icon: BookOpen,
      valor: "Cómo funciona la app",
      panel: <AppGuide />,
    },
    {
      id: "categorias",
      label: "Categorías",
      icon: Tag,
      valor: propias === 0 ? "Ninguna propia" : `${propias} ${propias === 1 ? "propia" : "propias"}`,
      panel: <CategoryPanel categories={data.categories} />,
    },
    {
      // **Apariencia y avisos van juntos, y no es un capricho.** Por
      // separado eran dos secciones de una sola fila: entrar a una
      // pantalla entera para encontrar un interruptor solo en el medio se
      // lee como que algo falta. Las dos dicen lo mismo —cómo se comporta
      // la app con vos— así que juntas se leen de una pasada.
      id: "preferencias",
      label: "Preferencias",
      icon: Palette,
      valor: `${TEMA[data.theme]} · avisos ${data.remindersEnabled ? "activados" : "apagados"}`,
      panel: (
        <>
          <ThemeSetting initial={data.theme} />
          {/* Con dos cosas en el mismo panel, la segunda necesita su
              rótulo: sin él, "En este dispositivo" cuelga de "Tema" y
              parece hablar del tema. */}
          <Subtitulo>Notificaciones push</Subtitulo>
          <RemindersSetting initialEnabled={data.remindersEnabled} />
        </>
      ),
    },
    {
      id: "datos",
      label: "Datos",
      icon: DownloadSimple,
      valor: "Exportar y reporte",
      panel: (
        <>
          <SettingsRow inline label="Exportar movimientos">
            <a
              href="/api/export-csv"
              download
              className={buttonClass({ variant: "secondary", size: "sm" })}
            >
              <DownloadSimple size={14} />
              Descargar CSV
            </a>
          </SettingsRow>
          <SettingsRow inline label="Reporte mensual">
            <Link
              href="/dashboard/reporte"
              className={buttonClass({ variant: "secondary", size: "sm" })}
            >
              <Printer size={14} />
              Ver el reporte
            </Link>
          </SettingsRow>
        </>
      ),
    },
    // **Solo en el APK.** Un lector de notificaciones es código nativo: en
    // la web no hay nada que mostrar, y una sección cuyo único contenido
    // sería "esto no está disponible acá" es peor que no estar.
    ...(isApp
      ? [
          {
            id: "lector",
            label: "Leer notificaciones",
            icon: BellSimple,
            valor: "Capturar avisos del banco",
            panel: <NotificationReader />,
          } as Seccion,
        ]
      : []),
    {
      // **El cerrojo y la sesión son la misma pregunta: quién puede
      // entrar.** Separados, "Cuenta" era una sola fila con el botón de
      // cerrar sesión.
      //
      // El cerrojo aparece también en la web, aunque sea del APK: es el
      // camino de recuperación si olvidás el PIN, porque desde el teléfono
      // quitarlo exige saberlo.
      id: "acceso",
      label: "Cuenta y acceso",
      icon: LockKey,
      valor: data.email,
      panel: (
        <>
          <SessionSettings email={data.email} />
          <Subtitulo>{isApp ? "Bloqueo" : "Bloqueo de la app de Android"}</Subtitulo>
          <AppLockSetting lockWhen={data.lockWhen} hasPin={data.hasPin} />
        </>
      ),
    },
    {
      // Lo destructivo va al final y separado: que comparta lugar con algo
      // inofensivo es justo cómo alguien borra su cuenta sin querer.
      id: "peligro",
      label: "Zona de peligro",
      icon: Warning,
      valor: "Borrar movimientos o la cuenta",
      danger: true,
      panel: (
        <>
          <DangerZone transactionCount={data.transactionCount} />
          <DeleteAccountFlow email={data.email} />
        </>
      ),
    },
  ];

  const actual = secciones.find((s) => s.id === elegida) ?? null;

  /**
   * Sin sección en la URL hay que mostrar dos cosas distintas según el
   * ancho: en escritorio, la primera sección —dos columnas con una vacía
   * se ve rota—; en teléfono, solo el índice, que es su primera pantalla.
   *
   * **La diferencia se resuelve con CSS y no midiendo la ventana.** Leer
   * el ancho en el primer dibujo del cliente no coincide con lo que
   * renderizó el servidor y rompe la hidratación; es el mismo error que ya
   * costó una vuelta con `prefers-reduced-motion`.
   */
  const mostrada = actual ?? secciones[0];
  const soloEscritorio = actual === null;

  return (
    <div className="flex flex-col gap-6">
      {/* En teléfono, con una sección abierta la tarjeta desaparece: ahí
          ocupa el primer cuarto de la pantalla para repetir algo que ya se
          vio en el índice, y empuja hacia abajo lo que uno vino a tocar.
          En escritorio se queda, porque no le quita el lugar a nada. */}
      <div className={actual ? "hidden lg:block" : "block"}>
        <AccountCard data={data} />
      </div>

      <div className="grid gap-8 lg:grid-cols-[17rem_1fr]">
        {/* El índice. En teléfono desaparece cuando hay una sección
            abierta; desde lg se queda siempre y acompaña al panel. */}
        <nav
          aria-label="Secciones de ajustes"
          className={`${actual ? "hidden lg:block" : "block"} lg:sticky lg:top-[84px] lg:self-start`}
        >
          <ul className="flex flex-col rounded-surface border border-line bg-surface p-1.5">
            {secciones.map((s) => (
              <li key={s.id}>
                <IndiceItem
                  seccion={s}
                  href={`${pathname}?s=${s.id}`}
                  activa={actual?.id === s.id}
                  // Sin ninguna elegida, en escritorio se está viendo la
                  // primera: se marca por CSS, que es lo que puede
                  // distinguir el ancho sin romper la hidratación.
                  activaEnEscritorio={soloEscritorio && s.id === secciones[0].id}
                />
              </li>
            ))}
          </ul>

          <p className="flex gap-4 px-2 pt-5 text-meta text-ink-3">
            <Link href="/privacidad" className="underline-offset-4 hover:text-ink hover:underline">
              Política de privacidad
            </Link>
            <Link href="/terminos" className="underline-offset-4 hover:text-ink hover:underline">
              Términos de servicio
            </Link>
          </p>
        </nav>

        <section
          className={`flex-col gap-4 ${soloEscritorio ? "hidden lg:flex" : "flex"}`}
        >
            <div className="flex items-center gap-2">
              {/* Solo en teléfono: desde lg el índice está al lado y una
                  flecha de volver no lleva a ninguna parte nueva. */}
              <Link
                href={pathname}
                aria-label="Volver a Ajustes"
                className="-ml-1.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-control text-ink-3 transition-colors duration-150 hover:bg-surface-hover hover:text-ink lg:hidden"
              >
                <ArrowLeft size={17} />
              </Link>
              <h2 className={`text-title ${mostrada.danger ? "text-expense" : "text-ink"}`}>
                {mostrada.label}
              </h2>
            </div>
            <div className="rounded-surface border border-line bg-surface px-4 py-1 sm:px-5">
              {mostrada.panel}
            </div>
        </section>
      </div>
    </div>
  );
}

/**
 * El rótulo de la segunda mitad de un panel que junta dos cosas.
 *
 * Los paneles con dos temas existen porque por separado eran secciones de
 * una sola fila, y entrar a una pantalla entera para encontrar un
 * interruptor solo en el medio se lee como que algo falta.
 */
function Subtitulo({ children }: { children: ReactNode }) {
  return (
    <h3 className="border-t border-line pb-1 pt-5 text-label font-medium text-ink">
      {children}
    </h3>
  );
}

/**
 * Una entrada del índice: ícono, nombre y el valor que tiene ahora.
 *
 * El valor es lo que hace que el índice se lea de un vistazo. Sin él son
 * nueve puertas idénticas y hay que abrirlas para saber qué hay detrás.
 */
function IndiceItem({
  seccion,
  href,
  activa,
  activaEnEscritorio = false,
}: {
  seccion: Seccion;
  href: string;
  activa: boolean;
  activaEnEscritorio?: boolean;
}) {
  const Icon = seccion.icon;
  return (
    <Link
      href={href}
      aria-current={activa ? "true" : undefined}
      className={`group flex items-center gap-3 rounded-control px-2.5 py-2.5 transition-[background-color,transform] duration-150 active:scale-[0.99] motion-reduce:transition-none motion-reduce:active:scale-100 ${
        activa
          ? "bg-surface-selected"
          : activaEnEscritorio
            ? "hover:bg-surface-hover lg:bg-surface-selected"
            : "hover:bg-surface-hover"
      }`}
    >
      <span
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-control ${
          seccion.danger ? "bg-expense/10 text-expense" : "bg-surface-raised text-ink-2"
        }`}
      >
        <Icon size={17} weight={activa ? "fill" : "regular"} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span
          className={`truncate text-label font-medium ${
            seccion.danger ? "text-expense" : "text-ink"
          }`}
        >
          {seccion.label}
        </span>
        {seccion.valor && (
          <span className="truncate text-meta text-ink-3">{seccion.valor}</span>
        )}
      </span>
      <CaretRight
        size={14}
        className="shrink-0 text-ink-3 transition-transform duration-150 group-hover:translate-x-0.5 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0 lg:hidden"
      />
    </Link>
  );
}

/**
 * La tarjeta de cuenta que abre la pantalla.
 *
 * Es el equivalente de la cifra protagonista del resto de las secciones:
 * Ajustes no tiene un número que mostrar, pero sí tiene que decir **en qué
 * cuenta estás** antes de ofrecer botones que la cambian.
 */
function AccountCard({ data }: { data: SettingsData }) {
  const movimientos = data.transactionCount;
  return (
    <div className="flex items-center gap-4 rounded-surface border border-line bg-surface p-4 sm:p-5">
      {data.avatarUrl ? (
        /* eslint-disable-next-line @next/next/no-img-element --
           viene de Google, con un dominio que no está configurado en
           `next/image`. Es la misma foto que ya dibuja el menú de cuenta. */
        <img
          src={data.avatarUrl}
          alt=""
          className="h-14 w-14 shrink-0 rounded-full object-cover sm:h-16 sm:w-16"
        />
      ) : (
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-surface-raised text-ink-3 sm:h-16 sm:w-16">
          <User size={24} />
        </span>
      )}
      <div className="flex min-w-0 flex-col">
        <span className="truncate text-title text-ink">
          {data.fullName || "Tu cuenta"}
        </span>
        <span className="truncate text-meta text-ink-3">{data.email}</span>
        <span className="pt-1 text-meta text-ink-3">
          {movimientos === 1 ? "1 movimiento anotado" : `${movimientos} movimientos anotados`}
        </span>
      </div>
    </div>
  );
}
