import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SettingsView } from "@/components/settings/SettingsView";
import { DEFAULT_EXPENSE_CATEGORIES } from "@/lib/categories";
import { resolveAvatarUrl, resolveDisplayName } from "@/lib/profile";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { Budget, UserCategory, UserSettings } from "@/lib/types";

export const metadata: Metadata = { title: "Ajustes" };

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ gmail_connected?: string; gmail_error?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const params = await searchParams;
  const admin = createAdminClient();

  const [
    { data: profile },
    { data: settings },
    { data: categories },
    { data: gmailConnections },
    { data: budgets },
    { count: transactionCount },
  ] = await Promise.all([
    supabase.from("profiles").select("full_name, avatar_url, birth_date").eq("id", user.id).maybeSingle(),
    supabase.from("user_settings").select("*").eq("user_id", user.id).maybeSingle(),
    supabase
      .from("user_categories")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true }),
    admin
      .from("gmail_tokens")
      .select("id, email, last_synced_at")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: true }),
    supabase
      .from("budgets")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true }),
    supabase
      .from("transactions")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id),
  ]);

  const budgetCategories = [
    ...new Set([
      ...DEFAULT_EXPENSE_CATEGORIES,
      ...(categories ?? []).filter((c) => c.type === "EXPENSE").map((c) => c.name),
    ]),
  ];

  const resolvedSettings: Pick<UserSettings, "theme"> = settings ?? { theme: "system" };

  return (
    <SettingsView
      userId={user.id}
      email={user.email ?? ""}
      fullName={resolveDisplayName(user, profile?.full_name) ?? ""}
      birthDate={profile?.birth_date ?? null}
      avatarUrl={resolveAvatarUrl(user, profile?.avatar_url) ?? null}
      categories={(categories ?? []) as UserCategory[]}
      budgets={(budgets ?? []) as Budget[]}
      budgetCategories={budgetCategories}
      theme={resolvedSettings.theme}
      gmailConnections={gmailConnections ?? []}
      transactionCount={transactionCount ?? 0}
      gmailNotice={params.gmail_connected ? "connected" : params.gmail_error ? "error" : undefined}
    />
  );
}
