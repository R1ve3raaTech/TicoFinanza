import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthPage } from "@/components/auth/AuthPage";
import { EndSessionOnEntry } from "@/components/auth/EndSessionOnEntry";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseConfig } from "@/lib/supabase/config";

export const metadata: Metadata = { title: "Entrar", robots: { index: false } };

export default async function EntrarPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; salida?: string; motivo?: string }>;
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
    <>
      {/* Si se está viendo esta pantalla es que no hay sesión: borra las
          pantallas guardadas para usar sin señal. Es la red que atrapa
          todas las formas de perder la sesión que no pasan por un botón
          (la cookie que vence, el servidor que la invalida). */}
      <EndSessionOnEntry />
      <AuthPage
        initialError={
          params.error === "auth" ? "No se pudo entrar con Google. Intentá de nuevo." : undefined
        }
        signOutWarning={params.salida === "pendiente"}
        idleNotice={params.motivo === "inactividad"}
      />
    </>
  );
}
