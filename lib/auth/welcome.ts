import "server-only";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendWelcomeEmailIfFirstTime } from "@/lib/email/welcomeEmail";
import { resolveFirstName } from "@/lib/profile";

/**
 * El correo de bienvenida, para quien entra por primera vez.
 *
 * Vive acá porque hay **dos puertas** que crean sesión: el callback de
 * Google en la web y el canje del token nativo del APK. Copiado en las dos,
 * la próxima vez que cambie algo (el nombre que saluda, por ejemplo) una de
 * las dos se queda vieja sin que nada avise.
 *
 * **Nunca lanza.** Que falle el correo no puede dejar a alguien afuera de
 * su propia cuenta: la sesión ya está abierta cuando esto corre, así que lo
 * peor que pasa es que no llegue el saludo, y eso va al registro.
 */
export async function welcomeIfFirstTime(
  supabase: SupabaseClient,
  user: User
): Promise<void> {
  if (!user.email) return;

  try {
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .maybeSingle();

    const firstName = resolveFirstName(user, profile?.full_name);
    const admin = createAdminClient();
    await sendWelcomeEmailIfFirstTime(admin, user.id, user.email, firstName);
  } catch (error) {
    console.error("[TicoFinanza] [auth] no se pudo enviar la bienvenida:", error);
  }
}
