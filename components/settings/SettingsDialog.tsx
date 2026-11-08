"use client";

import { useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { DownloadSimple, Printer } from "@phosphor-icons/react";
import { WelcomeDialog } from "@/components/onboarding/WelcomeDialog";
import { Button, buttonClass } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import type { Theme, UserCategory } from "@/lib/types";
import { AppGuide } from "./AppGuide";
import { CategoryManager } from "./CategoryManager";
import { DangerZone } from "./DangerZone";
import { DeleteAccountFlow } from "./DeleteAccountFlow";
import { ProfileSettings } from "./ProfileSettings";
import { RemindersSetting } from "./RemindersSetting";
import { SessionSettings } from "./SessionSettings";
import { SettingsRow } from "./SettingsSection";
import { ThemeSetting } from "./ThemeSetting";

export interface SettingsData {
  userId: string;
  email: string;
  fullName: string;
  birthDate: string | null;
  avatarUrl: string | null;
  categories: UserCategory[];
  theme: Theme;
  /** Flag de la cuenta. Que ESTE navegador los reciba lo revisa el switch. */
  remindersEnabled: boolean;
  transactionCount: number;
}

/**
 * Un bloque de ajustes: título y sus filas, separado del siguiente por
 * aire y una línea.
 */
function Bloque({
  title,
  children,
  danger = false,
}: {
  title: string;
  children: ReactNode;
  /** Lo destructivo se separa más y va al final. */
  danger?: boolean;
}) {
  return (
    <section className={danger ? "pt-9" : "pt-7 first:pt-0"}>
      <h3 className={`pb-3 text-heading ${danger ? "text-expense" : "text-ink"}`}>{title}</h3>
      <div className="border-t border-line">{children}</div>
    </section>
  );
}

/**
 * Ajustes, en un diálogo.
 *
 * Antes era la quinta pantalla de la app. Dejó de serlo porque no es un
 * lugar donde uno *esté*: se entra a cambiar una cosa y se sale. Como
 * pantalla, además, obligaba a abandonar lo que estabas viendo y volver
 * después; como diálogo, lo de atrás sigue ahí.
 *
 * **Todo junto y con scroll, no en pestañas.** La primera versión tenía
 * siete pestañas y la mitad llevaban a un panel con una sola fila:
 * "Recordatorios" era un interruptor solo en medio de una pantalla vacía,
 * y "Apariencia" lo mismo. Repartir seis controles en siete pestañas hace
 * que cada una se vea vacía y que haya que tocar siete veces para ver lo
 * que entra de una pasada de scroll. Los bloques siguen separados con
 * título y línea: junto no es amontonado.
 */
export function SettingsDialog({
  open,
  onClose,
  data,
}: {
  open: boolean;
  onClose: () => void;
  data: SettingsData;
}) {
  const [closing, setClosing] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  // Lo que el perfil deja acá para que "Guardar y salir" mande lo pendiente.
  const flushRef = useRef<(() => Promise<boolean>) | null>(null);

  async function done() {
    setClosing(true);
    try {
      // Si el servidor rechaza (un nombre vacío), el diálogo no se cierra
      // encima del error: quien le dio al botón tiene que poder verlo.
      const ok = (await flushRef.current?.()) ?? true;
      if (!ok) return;
      onClose();
    } finally {
      setClosing(false);
    }
  }

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        size="xl"
        title="Ajustes"
        footer={
          <Button variant="primary" onClick={done} disabled={closing}>
            {closing ? "Guardando..." : "Guardar y salir"}
          </Button>
        }
      >
        {/* Cualquier enlace de adentro lleva a otra pantalla, y el diálogo
            vive en el layout: sin esto se quedaría abierto encima del
            reporte. Un solo manejador en lugar de pasarle `onClose` a los
            seis o siete enlaces repartidos por los bloques. */}
        <div
          onClick={(e) => {
            if ((e.target as HTMLElement).closest("a[href]")) onClose();
          }}
        >
          <Bloque title="Perfil">
            <ProfileSettings
              userId={data.userId}
              initialFullName={data.fullName}
              initialBirthDate={data.birthDate}
              initialAvatarUrl={data.avatarUrl}
              flushRef={flushRef}
            />
          </Bloque>

          <Bloque title="Categorías">
            <CategoryManager categories={data.categories} />
          </Bloque>

          <Bloque title="Apariencia">
            <ThemeSetting initial={data.theme} />
          </Bloque>

          <Bloque title="Recordatorios">
            <RemindersSetting initialEnabled={data.remindersEnabled} />
          </Bloque>

          <Bloque title="Datos">
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
          </Bloque>

          <Bloque title="Guía">
            <SettingsRow inline label="Cómo funciona la app">
              {/* La misma bienvenida que ve quien se registra, a pedido y
                  sin el contador: acá nadie necesita que lo frenen. */}
              <Button variant="secondary" size="sm" onClick={() => setGuideOpen(true)}>
                Ver la bienvenida
              </Button>
            </SettingsRow>
            <div className="pt-4">
              <AppGuide />
            </div>
          </Bloque>

          <Bloque title="Cuenta">
            <SessionSettings email={data.email} />
          </Bloque>

          {/* Lo destructivo va al final y separado: que comparta lugar con
              algo inofensivo es justo cómo alguien borra su cuenta sin
              querer. */}
          <Bloque title="Zona de peligro" danger>
            <DangerZone transactionCount={data.transactionCount} />
            <DeleteAccountFlow email={data.email} />
          </Bloque>

          <p className="flex gap-4 pt-6 text-meta text-ink-3">
            <Link href="/privacidad" className="underline-offset-4 hover:text-ink hover:underline">
              Política de privacidad
            </Link>
            <Link href="/terminos" className="underline-offset-4 hover:text-ink hover:underline">
              Términos de servicio
            </Link>
          </p>
        </div>
      </Dialog>

      {guideOpen && <WelcomeDialog countdown={0} onDone={() => setGuideOpen(false)} />}
    </>
  );
}
