import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { IntroCarousel } from "@/components/app/IntroCarousel";
import { isAppUserAgent } from "@/lib/appMode";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseConfig } from "@/lib/supabase/config";

export const metadata: Metadata = { title: "Bienvenido", robots: { index: false } };

/**
 * La bienvenida del APK.
 *
 * **Solo existe dentro del APK.** En la web ese trabajo —contarte de qué se
 * trata antes de pedirte nada— lo hace la portada, y tener las dos cosas
 * sería la misma explicación en dos puertas. Quien llegue acá desde un
 * navegador va a la portada.
 */
export default async function BienvenidaPage() {
  const isApp = isAppUserAgent((await headers()).get("user-agent"));
  if (!isApp) redirect("/");

  const configured = Boolean(getSupabaseConfig());
  if (configured) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    // Con sesión no hay nada que presentar.
    if (user) redirect("/dashboard");
  }

  return <IntroCarousel authDisabled={!configured} />;
}
