import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthPage } from "@/components/auth/AuthPage";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseConfig } from "@/lib/supabase/config";

export const metadata: Metadata = { title: "Entrar", robots: { index: false } };

export default async function EntrarPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; salida?: string }>;
}) {
  const params = await searchParams;
  if (getSupabaseConfig()) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) redirect("/dashboard");
  }

  return (
    <AuthPage
      initialError={
        params.error === "auth" ? "No se pudo entrar con Google. Intentá de nuevo." : undefined
      }
      signOutWarning={params.salida === "pendiente"}
    />
  );
}
