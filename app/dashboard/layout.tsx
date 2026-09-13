import type { ReactNode } from "react";
import { AppShell } from "@/components/shell/AppShell";
import { ThemeSync } from "@/components/ThemeSync";
import { resolveAvatarUrl, resolveFirstName } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";

/**
 * Shell compartido por /dashboard, /dashboard/insights y /dashboard/settings:
 * rail en tablet/escritorio y pestañas abajo en teléfono (ver AppShell). Si no
 * hay sesión, cada página sigue haciendo su propio `redirect("/")` — acá solo
 * se intenta traer nombre/foto para la navegación, sin bloquear el render si
 * falla.
 */
export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

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

  return (
    <AppShell name={firstName} email={user?.email ?? undefined} avatarUrl={avatarUrl}>
      <ThemeSync dbTheme={dbTheme} />
      {children}
    </AppShell>
  );
}
