import { getSupabaseConfig } from "./config";

/**
 * Reconoce las cookies de sesión de ESTE proyecto de Supabase (el prefijo
 * incluye el id del proyecto), para poder limpiarlas al cerrar sesión sin
 * tocar las de otros proyectos abiertos en el mismo navegador.
 */
export function isProjectAuthCookie(name: string): boolean {
  const config = getSupabaseConfig();
  if (!config) return false;
  const prefix = `sb-${new URL(config.url).hostname.split(".")[0]}-auth-token`;
  return name === prefix || name === `${prefix}-code-verifier` ||
    (name.startsWith(`${prefix}.`) && /^\d+$/.test(name.slice(prefix.length + 1)));
}
