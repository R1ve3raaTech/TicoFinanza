import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Comprueba que una fila referenciada sea del usuario de la sesión.
 *
 * Hace falta porque RLS protege lo que se escribe, no lo que se referencia:
 * la política de `transactions` solo exige que `user_id` sea el de la
 * sesión, así que un `account_id` de otra persona pasaría igual y el
 * movimiento terminaría moviendo el saldo de una cuenta ajena. La consulta
 * se hace con el cliente del usuario, así que RLS no devuelve nada si la
 * fila no es suya.
 */
export async function ownsRow(
  client: SupabaseClient,
  table: "accounts" | "savings_goals",
  id: string | null | undefined
): Promise<boolean> {
  if (!id) return true; // "sin cuenta" es válido
  const { data, error } = await client.from(table).select("id").eq("id", id).maybeSingle();
  return !error && Boolean(data);
}
