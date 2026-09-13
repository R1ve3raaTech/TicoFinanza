import Link from "next/link";
import { CheckCircle, DownloadSimple, WarningCircle } from "@phosphor-icons/react/dist/ssr";
import { PageHeader } from "@/components/shell/PageHeader";
import { buttonClass } from "@/components/ui/Button";
import type { Budget, Theme, UserCategory } from "@/lib/types";
import { BudgetManager } from "./BudgetManager";
import { CategoryManager } from "./CategoryManager";
import { DangerZone } from "./DangerZone";
import { DeleteAccountFlow } from "./DeleteAccountFlow";
import { GmailConnections, type GmailConnection } from "./GmailConnections";
import { NotificationsSetting } from "./NotificationsSetting";
import { ProfileSettings } from "./ProfileSettings";
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
  budgets,
  budgetCategories,
  theme,
  gmailConnections,
  transactionCount,
  gmailNotice,
}: {
  userId: string;
  email: string;
  fullName: string;
  birthDate: string | null;
  avatarUrl: string | null;
  categories: UserCategory[];
  budgets: Budget[];
  budgetCategories: string[];
  theme: Theme;
  gmailConnections: GmailConnection[];
  transactionCount: number;
  gmailNotice?: "connected" | "error";
}) {
  return (
    <main id="contenido" className="mx-auto w-full max-w-[1000px] px-4 pb-16 md:px-8 xl:px-12">
      <PageHeader title="Ajustes" meta="Tu cuenta, tu dinero y cómo se ve la app." />

      <div className="lg:grid lg:grid-cols-[170px_minmax(0,1fr)] lg:gap-14">
        <SettingsIndex />

        <div className="min-w-0 max-w-[720px]">
          {gmailNotice === "connected" && (
            <p
              role="status"
              className="mb-8 flex items-center gap-2.5 rounded-control border border-line bg-surface px-3 py-2.5 text-sm text-ink"
            >
              <CheckCircle size={18} weight="fill" aria-hidden className="shrink-0 text-income" />
              Cuenta de Gmail conectada correctamente.
            </p>
          )}
          {gmailNotice === "error" && (
            <p
              role="alert"
              className="mb-8 flex items-center gap-2.5 rounded-control border border-expense/30 bg-surface px-3 py-2.5 text-sm text-ink"
            >
              <WarningCircle size={18} weight="fill" aria-hidden className="shrink-0 text-expense" />
              No se pudo conectar la cuenta de Gmail. Intentá de nuevo.
            </p>
          )}

          <SettingsSection id="perfil" title="Perfil" description="Tu nombre y tu foto.">
            <ProfileSettings
              userId={userId}
              initialFullName={fullName}
              initialBirthDate={birthDate}
              initialAvatarUrl={avatarUrl}
            />
          </SettingsSection>

          <SettingsSection
            id="gmail"
            title="Gmail"
            description="Las cuentas de las que se leen tus correos bancarios. Solo lectura."
          >
            <GmailConnections connections={gmailConnections} />
          </SettingsSection>

          <SettingsSection
            id="categorias"
            title="Categorías"
            description="Se suman a las categorías por defecto al anotar o editar un movimiento."
          >
            <CategoryManager categories={categories} />
          </SettingsSection>

          <SettingsSection
            id="presupuestos"
            title="Presupuestos"
            description="Un límite mensual por categoría. Te avisamos por push cuando te pasás."
          >
            <BudgetManager budgets={budgets} categories={budgetCategories} />
          </SettingsSection>

          <SettingsSection id="notificaciones" title="Notificaciones">
            <NotificationsSetting />
          </SettingsSection>

          <SettingsSection id="apariencia" title="Apariencia">
            <ThemeSetting initial={theme} />
          </SettingsSection>

          <SettingsSection id="datos" title="Datos">
            <SettingsRow
              inline
              label="Exportar movimientos"
              description="Un CSV con todos tus movimientos, para abrir en Excel o Google Sheets."
            >
              <a href="/api/export-csv" className={buttonClass({ variant: "secondary", size: "sm" })}>
                <DownloadSimple size={14} />
                Descargar CSV
              </a>
            </SettingsRow>
          </SettingsSection>

          <SettingsSection id="sesion" title="Sesión">
            <SessionSettings email={email} />
          </SettingsSection>

          {/* Lo destructivo va en su propia sección y al final: que comparta
              lugar con una descarga inofensiva es justo cómo alguien borra su
              cuenta sin querer. */}
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
