"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { DownloadSimple, Printer } from "@phosphor-icons/react";
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

const TABS = [
  { id: "perfil", label: "Perfil" },
  { id: "categorias", label: "Categorías" },
  { id: "apariencia", label: "Apariencia" },
  { id: "recordatorios", label: "Recordatorios" },
  { id: "datos", label: "Datos" },
  { id: "guia", label: "Guía" },
  { id: "cuenta", label: "Cuenta" },
] as const;

type TabId = (typeof TABS)[number]["id"];

/**
 * Ajustes, en un diálogo.
 *
 * Antes era la quinta pantalla de la app. Dejó de serlo porque no es un
 * lugar donde uno *esté*: se entra a cambiar una cosa y se sale. Como
 * pantalla, además, obligaba a abandonar lo que estabas viendo y volver
 * después; como diálogo, lo de atrás sigue ahí.
 *
 * **Una pestaña a la vez, no una lista larga con scroll.** Con las siete
 * secciones apiladas, el diálogo era la misma pantalla de antes metida en
 * una caja más chica. Los chips se deslizan de costado en teléfono, igual
 * que el filtro de períodos de Movimientos.
 *
 * Abre en "Perfil" a propósito: es a lo que más se entra, y es lo que
 * contesta "¿esta es mi cuenta?".
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
  const [tab, setTab] = useState<TabId>("perfil");
  const [closing, setClosing] = useState(false);
  // Lo que el perfil deja acá para que "Listo" mande lo que no se guardó.
  const flushRef = useRef<(() => Promise<boolean>) | null>(null);

  async function done() {
    setClosing(true);
    try {
      // Si el servidor rechaza (un nombre vacío), el diálogo no se cierra
      // encima del error: quien le dio a "Listo" tiene que poder verlo.
      const ok = (await flushRef.current?.()) ?? true;
      if (!ok) {
        setTab("perfil");
        return;
      }
      onClose();
    } finally {
      setClosing(false);
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      size="xl"
      title="Ajustes"
      footer={
        <Button variant="primary" onClick={done} disabled={closing}>
          {closing ? "Guardando..." : "Listo"}
        </Button>
      }
    >
      {/* Cualquier enlace de adentro lleva a otra pantalla, y el diálogo
          vive en el layout: sin esto se quedaría abierto encima del
          reporte. Un solo manejador en lugar de pasarle `onClose` a los
          seis o siete enlaces repartidos por las pestañas. */}
      <div
        onClick={(e) => {
          if ((e.target as HTMLElement).closest("a[href]")) onClose();
        }}
      >
        <div
          role="tablist"
          aria-label="Secciones de ajustes"
          className="-mx-5 flex gap-1 overflow-x-auto border-b border-line px-5 pb-3 scrollbar-none"
        >
          {TABS.map((item) => {
            const active = tab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setTab(item.id)}
                className={`inline-flex h-8 shrink-0 cursor-pointer items-center whitespace-nowrap rounded-control px-3 text-label transition-[color,background-color,transform] duration-150 active:scale-[0.97] motion-reduce:active:scale-100 ${
                  active
                    ? "bg-surface-raised text-ink"
                    : "font-normal text-ink-3 hover:text-ink"
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>

        <div className="pt-4">
          {tab === "perfil" && (
            <ProfileSettings
              userId={data.userId}
              initialFullName={data.fullName}
              initialBirthDate={data.birthDate}
              initialAvatarUrl={data.avatarUrl}
              flushRef={flushRef}
            />
          )}

          {tab === "categorias" && (
            <>
              <p className="pb-3 text-sm leading-relaxed text-ink-2">
                Se suman a las que trae la app. También se pueden crear desde el formulario, al
                anotar un movimiento.
              </p>
              <div className="border-t border-line">
                <CategoryManager categories={data.categories} />
              </div>
            </>
          )}

          {tab === "apariencia" && (
            <div className="border-t border-line">
              <ThemeSetting initial={data.theme} />
            </div>
          )}

          {tab === "recordatorios" && (
            <>
              <p className="pb-3 text-sm leading-relaxed text-ink-2">
                Avisos de los cobros que se vienen. Se activan por dispositivo: el teléfono y la
                compu se piden por separado.
              </p>
              <div className="border-t border-line">
                <RemindersSetting initialEnabled={data.remindersEnabled} />
              </div>
            </>
          )}

          {tab === "datos" && (
            <div className="border-t border-line">
              <SettingsRow
                inline
                label="Exportar movimientos"
                description="Un CSV con tus ingresos, gastos y transferencias, para abrir en Excel o Google Sheets."
              >
                <a
                  href="/api/export-csv"
                  download
                  className={buttonClass({ variant: "secondary", size: "sm" })}
                >
                  <DownloadSimple size={14} />
                  Descargar CSV
                </a>
              </SettingsRow>

              <SettingsRow
                inline
                label="Reporte mensual"
                description="El mes en una hoja: resumen, desglose por categoría y el detalle de cada movimiento. Se imprime o se guarda como PDF desde el navegador."
              >
                <Link
                  href="/dashboard/reporte"
                  className={buttonClass({ variant: "secondary", size: "sm" })}
                >
                  <Printer size={14} />
                  Ver el reporte
                </Link>
              </SettingsRow>
            </div>
          )}

          {tab === "guia" && <AppGuide />}

          {tab === "cuenta" && (
            <>
              <div className="border-t border-line">
                <SessionSettings email={data.email} />
              </div>

              {/* Lo destructivo va al final y separado: que comparta lugar
                  con algo inofensivo es justo cómo alguien borra su cuenta
                  sin querer. */}
              <h3 className="pb-0.5 pt-6 text-heading text-ink">Zona de peligro</h3>
              <p className="pb-3 text-sm text-ink-3">
                Acciones permanentes. Cada una pide confirmación.
              </p>
              <div className="border-t border-line">
                <DangerZone transactionCount={data.transactionCount} />
                <DeleteAccountFlow email={data.email} />
              </div>

              <p className="flex gap-4 pt-5 text-meta text-ink-3">
                <Link href="/privacidad" className="underline-offset-4 hover:text-ink hover:underline">
                  Política de privacidad
                </Link>
                <Link href="/terminos" className="underline-offset-4 hover:text-ink hover:underline">
                  Términos de servicio
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </Dialog>
  );
}
