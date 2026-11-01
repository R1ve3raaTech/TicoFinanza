import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/shell/AppShell";
import { ThemeSync } from "@/components/ThemeSync";
import { resolveAvatarUrl, resolveFirstName } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";

/**
 * Shell compartido por /dashboard y sus secciones (fijos, movimientos, ajustes):
 * rail en tablet/escritorio y pestañas abajo en teléfono (ver AppShell).
 * Comprueba el usuario en servidor antes de mostrar el área protegida.
 */
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

  return (
    <AppShell name={firstName} email={user?.email ?? undefined} avatarUrl={avatarUrl}>
      <ThemeSync dbTheme={dbTheme} />
      {children}
    </AppShell>
  );
}
