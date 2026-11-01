/** Configuración pública compartida; nunca sustituye una sesión ni un backend real. */
export function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !key || key === "[SENSITIVE]" || key.startsWith("your-")) return null;
  try {
    const parsed = new URL(url);
    if (!["http:", "https:"].includes(parsed.protocol) || !parsed.hostname) return null;
    return { url, key };
  } catch {
    return null;
  }
}

export const AUTH_CONFIGURATION_ERROR =
  "La autenticación no está disponible: falta configurar la URL y la clave pública de Supabase en el servidor.";
