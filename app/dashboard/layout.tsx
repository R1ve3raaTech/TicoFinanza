import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { OfflineBanner } from "@/components/offline/OfflineBanner";
import { MovementEntryProvider } from "@/components/movements/MovementEntry";
import { WelcomeDialog } from "@/components/onboarding/WelcomeDialog";
import { QueueOwnerProvider } from "@/components/offline/QueueOwner";
import { SettingsEntryProvider } from "@/components/settings/SettingsEntry";
import { CategoryStyleProvider } from "@/components/ui/CategoryStyle";
import { AppShell } from "@/components/shell/AppShell";
import { IdleLogout } from "@/components/shell/IdleLogout";
import { ThemeSync } from "@/components/ThemeSync";
import { resolveAvatarUrl, resolveDisplayName, resolveFirstName } from "@/lib/profile";
import { shouldShowWelcome } from "@/lib/onboarding";
import { createClient } from "@/lib/supabase/server";
import type { RecentMovement } from "@/lib/quickEntry";
import type { Account, UserCategory } from "@/lib/types";

/**
 * Shell compartido por /dashboard y sus secciones (fijos, movimientos, plan):
 * píldora arriba en tablet/escritorio y píldora abajo en teléfono (ver
 * AppShell). Comprueba el usuario en servidor antes de mostrar el área
 * protegida.
 *
 * Acá también se cargan los datos de Ajustes, que dejó de ser una pantalla y
 * pasó a ser un diálogo que se abre desde cualquier sección. Son dos
 * consultas chicas más (las categorías propias y cuántos movimientos hay)
 * contra las dos que ya había, todas en paralelo: a cambio, el diálogo abre
 * lleno y sin espera desde cualquier pantalla.
 */
const STAMP = new Intl.DateTimeFormat("es-CR", {
  day: "numeric",
  month: "long",
  hour: "numeric",
  minute: "2-digit",
  timeZone: "America/Costa_Rica",
});

/**
 * Cuándo se generó esta pantalla: el texto para mostrar y el instante para
 * comparar, de una sola lectura del reloj.
 *
 * Juntos a propósito. Si salieran de dos lecturas podrían referirse a
 * momentos distintos, y los dos usos —avisar de qué hora son los datos y
 * decidir si esta pantalla prueba que hay sesión viva— tienen que hablar
 * del mismo instante.
 */
function renderedStamp(): { label: string; ms: number } {
  const now = new Date();
  return { label: STAMP.format(now), ms: now.getTime() };
}

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/entrar");

  const [
    { data: profile },
    { data: settings },
    { data: categories },
    { count: transactionCount },
    { data: accounts },
    { data: recent },
  ] = await Promise.all([
      supabase
        .from("profiles")
        .select("full_name, avatar_url, birth_date")
        .eq("id", user.id)
        .maybeSingle(),
      supabase
        .from("user_settings")
        .select("theme, reminders_enabled, onboarding_seen")
        .eq("user_id", user.id)
        .maybeSingle(),
      supabase
        .from("user_categories")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true }),
      supabase
        .from("transactions")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id),
      // Las dos que necesita el formulario de movimientos, que vive acá y
      // no en cada pantalla (ver MovementEntryProvider).
      supabase
        .from("accounts")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true }),
      supabase
        .from("transactions")
        .select("description, category, account_id, transaction_date, amount, type")
        .eq("user_id", user.id)
        .not("description", "is", null)
        .order("transaction_date", { ascending: false })
        .limit(80),
    ]);

  const firstName = resolveFirstName(user, profile?.full_name);
  const avatarUrl = resolveAvatarUrl(user, profile?.avatar_url);
  const dbTheme = settings?.theme ?? "system";
  // Los tres casos y por qué, con pruebas, en lib/onboarding.ts.
  const showWelcome = shouldShowWelcome(settings);

  const stamp = renderedStamp();

  return (
    // Los íconos y colores que el usuario le puso a sus categorías, para
    // todas las listas de adentro. Sale de las mismas categorías que ya se
    // consultan para el diálogo de ajustes: no hay consulta nueva.
    <CategoryStyleProvider categories={(categories ?? []) as UserCategory[]}>
      {/* El provider de ajustes envuelve al shell y no al contenido: el
          botón que abre el diálogo vive en las dos píldoras de navegación,
          que AppShell dibuja FUERA de sus children. Adentro, el contexto no
          les llegaría. */}
      <SettingsEntryProvider
        data={{
          userId: user.id,
          email: user.email ?? "",
          fullName: resolveDisplayName(user, profile?.full_name) ?? "",
          birthDate: profile?.birth_date ?? null,
          avatarUrl: avatarUrl ?? null,
          categories: (categories ?? []) as UserCategory[],
          theme: dbTheme,
          remindersEnabled: settings?.reminders_enabled ?? false,
          transactionCount: transactionCount ?? 0,
        }}
      >
        {/* El formulario de movimientos vive acá y no en cada pantalla: el
            "+" de la píldora de teléfono tiene que poder abrirlo desde
            donde sea, y AppShell dibuja la píldora fuera de sus children. */}
        <MovementEntryProvider
          customCategories={(categories ?? []) as UserCategory[]}
          accounts={(accounts ?? []) as Account[]}
          recent={(recent ?? []) as RecentMovement[]}
        >
          <AppShell name={firstName} email={user?.email ?? undefined} avatarUrl={avatarUrl}>
          <ThemeSync dbTheme={dbTheme} />
          {/* Solo dentro del área con sesión: afuera no hay nada que cerrar. */}
          <IdleLogout />
          {/* De quién es lo que quedó sin enviar. IndexedDB es del origen y
              sobrevive al cierre de sesión, así que la cola se filtra por el
              usuario de la sesión (ver components/offline/QueueOwner.tsx). */}
          <QueueOwnerProvider userId={user.id} renderedAtMs={stamp.ms}>
            {/* La hora se arma acá, al generar la pantalla, y queda escrita en
                el HTML: cuando ese HTML sale del caché sin señal, el aviso
                dice de cuándo son los datos de verdad. */}
            <OfflineBanner renderedAt={stamp.label} />
            {showWelcome && <WelcomeDialog />}
            {children}
          </QueueOwnerProvider>
          </AppShell>
        </MovementEntryProvider>
      </SettingsEntryProvider>
    </CategoryStyleProvider>
  );
}
