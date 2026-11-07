import Link from "next/link";
import { DownloadSimple, Printer } from "@phosphor-icons/react/dist/ssr";
import { Avatar } from "@/components/shell/Avatar";
import { PageHeader } from "@/components/shell/PageHeader";
import { buttonClass } from "@/components/ui/Button";
import type { Theme, UserCategory } from "@/lib/types";
import { CategoryManager } from "./CategoryManager";
import { DangerZone } from "./DangerZone";
import { DeleteAccountFlow } from "./DeleteAccountFlow";
import { AppGuide } from "./AppGuide";
import { ProfileSettings } from "./ProfileSettings";
import { RemindersSetting } from "./RemindersSetting";
import { SessionSettings } from "./SessionSettings";
import { SettingsIndex } from "./SettingsIndex";
import { SettingsRow, SettingsSection } from "./SettingsSection";
import { ThemeSetting } from "./ThemeSetting";

export function SettingsView({
  userId,
  email,
  fullName,
  birthDate,
  avatarUrl,
  categories,
  theme,
  remindersEnabled,
  transactionCount,
}: {
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
}) {
  return (
    <main id="contenido" className="mx-auto w-full max-w-[1180px] px-4 pb-12 md:px-8 xl:px-12">
      <PageHeader title="Ajustes" meta="Tu cuenta, tus categorías, los recordatorios y cómo se ve la app." />

      {/* Ajustes es la única sección sin una cifra que la encabece, así que
          lo que abre es de quién es esta app. La pantalla entraba directo a
          una lista de controles, sin nada que dijera en qué cuenta estás —
          que es justo lo que uno viene a comprobar cuando entra acá. */}
      <section
        aria-label="Tu cuenta"
        className="flex items-center gap-3.5 border-b border-line pb-6 pt-4 md:gap-4 md:pt-2"
      >
        <Avatar src={avatarUrl} name={fullName || email} size={52} />
        <div className="min-w-0">
          <p className="truncate text-[1.25rem] font-semibold leading-tight tracking-[-0.02em] text-ink">
            {fullName || "Tu cuenta"}
          </p>
          <p className="truncate text-label text-ink-3">{email}</p>
          <p className="mt-1 text-meta text-ink-3">
            {transactionCount === 0
              ? "Todavía no anotaste ningún movimiento"
              : `${transactionCount.toLocaleString("es-CR")} movimiento${
                  transactionCount === 1 ? "" : "s"
                } anotado${transactionCount === 1 ? "" : "s"}`}
          </p>
        </div>
      </section>

      <div className="pt-6 lg:grid lg:grid-cols-[150px_minmax(0,1fr)] lg:gap-10 xl:gap-14">
        <SettingsIndex />

        <div className="min-w-0 max-w-[880px]">
          <SettingsSection
            id="guia"
            title="Guía de la app"
            description="Qué hace cada sección y las dos o tres cosas que suelen confundirse."
          >
            <AppGuide />
          </SettingsSection>

          <SettingsSection id="perfil" title="Perfil" description="Tu nombre y tu foto.">
            <ProfileSettings
              userId={userId}
              initialFullName={fullName}
              initialBirthDate={birthDate}
              initialAvatarUrl={avatarUrl}
            />
          </SettingsSection>

          <SettingsSection
            id="categorias"
            title="Categorías"
            description="Se suman a las que trae la app, y aparecen al registrar un movimiento o un gasto fijo."
          >
            <CategoryManager categories={categories} />
          </SettingsSection>

          <SettingsSection id="apariencia" title="Apariencia">
            <ThemeSetting initial={theme} />
          </SettingsSection>

          <SettingsSection
            id="recordatorios"
            title="Recordatorios"
            description="Avisos de los cobros que se vienen. Se activan por dispositivo: el teléfono y la compu se piden por separado."
          >
            <RemindersSetting initialEnabled={remindersEnabled} />
          </SettingsSection>

          <SettingsSection id="datos" title="Datos">
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
          </SettingsSection>

          <SettingsSection id="sesion" title="Sesión">
            <SessionSettings email={email} />
          </SettingsSection>

          {/* Lo destructivo va en su propia sección y al final: que comparta
              lugar con algo inofensivo es justo cómo alguien borra su cuenta
              sin querer. */}
          <SettingsSection
            id="peligro"
            title="Zona de peligro"
            description="Acciones permanentes. Cada una pide confirmación."
          >
            <DangerZone transactionCount={transactionCount} />
            <DeleteAccountFlow email={email} />
          </SettingsSection>

          <p className="flex gap-4 text-meta text-ink-3">
            <Link href="/privacidad" className="underline-offset-4 hover:text-ink hover:underline">
              Política de privacidad
            </Link>
            <Link href="/terminos" className="underline-offset-4 hover:text-ink hover:underline">
              Términos de servicio
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
