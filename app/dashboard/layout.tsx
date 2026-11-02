import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { OfflineBanner } from "@/components/offline/OfflineBanner";
import { QueueOwnerProvider } from "@/components/offline/QueueOwner";
import { AppShell } from "@/components/shell/AppShell";
import { IdleLogout } from "@/components/shell/IdleLogout";
import { ThemeSync } from "@/components/ThemeSync";
import { resolveAvatarUrl, resolveFirstName } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";

/**
 * Shell compartido por /dashboard y sus secciones (fijos, movimientos, ajustes):
 * rail en tablet/escritorio y pestañas abajo en teléfono (ver AppShell).
 * Comprueba el usuario en servidor antes de mostrar el área protegida.
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

  let firstName: string | undefined;
  let avatarUrl: string | undefined;
  let dbTheme: "dark" | "light" | "system" = "system";

  if (user) {
    const [{ data: profile }, { data: settings }] = await Promise.all([
      supabase.from("profiles").select("full_name, avatar_url").eq("id", user.id).maybeSingle(),
      supabase.from("user_settings").select("theme").eq("user_id", user.id).maybeSingle(),
    ]);
    firstName = resolveFirstName(user, profile?.full_name);
    avatarUrl = resolveAvatarUrl(user, profile?.avatar_url);
    dbTheme = settings?.theme ?? "system";
  }

  const stamp = renderedStamp();

  return (
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
        {children}
      </QueueOwnerProvider>
    </AppShell>
  );
}
