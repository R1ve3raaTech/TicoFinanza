import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Cliente con service_role: ignora RLS. Solo para lo que no puede pasar por
 * la sesión del usuario — hoy, los códigos de eliminación de cuenta, el
 * límite de tasa de esos envíos y el borrado del usuario en auth.users.
 * Nunca importar desde un componente cliente.
 */
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}
