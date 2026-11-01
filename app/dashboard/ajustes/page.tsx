import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SettingsView } from "@/components/settings/SettingsView";
import { resolveAvatarUrl, resolveDisplayName } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";
import type { UserCategory, UserSettings } from "@/lib/types";

export const metadata: Metadata = { title: "Ajustes" };

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/entrar");

  const [{ data: profile }, { data: settings }, { data: categories }, { count: transactionCount }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("full_name, avatar_url, birth_date")
        .eq("id", user.id)
        .maybeSingle(),
      supabase.from("user_settings").select("*").eq("user_id", user.id).maybeSingle(),
      supabase
        .from("user_categories")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true }),
      supabase
        .from("transactions")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id),
    ]);

  const resolvedSettings: Pick<UserSettings, "theme" | "reminders_enabled"> = settings ?? {
    theme: "system",
    reminders_enabled: false,
  };

  return (
    <SettingsView
      userId={user.id}
      email={user.email ?? ""}
      fullName={resolveDisplayName(user, profile?.full_name) ?? ""}
      birthDate={profile?.birth_date ?? null}
      avatarUrl={resolveAvatarUrl(user, profile?.avatar_url) ?? null}
      categories={(categories ?? []) as UserCategory[]}
      theme={resolvedSettings.theme}
      remindersEnabled={resolvedSettings.reminders_enabled ?? false}
      transactionCount={transactionCount ?? 0}
    />
  );
}
