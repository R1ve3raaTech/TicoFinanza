"use client";

import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

/**
 * Login con Google directo contra el endpoint de Google (no vía
 * supabase.auth.signInWithOAuth), para que la pantalla de consentimiento
 * de Google muestre el dominio real de la app en vez de "...supabase.co".
 * Ver app/auth/login/route.ts y app/auth/callback/route.ts.
 */
export function signInWithGoogle() {
  // /auth/login no es una página, es un Route Handler que hace un 302 fuera
  // del sitio (a Google). Necesita una navegación de página completa, no
  // router.push() (client-side), para que ese salto se siga bien.
  // eslint-disable-next-line @next/next/no-location-assign-relative-destination
  window.location.href = "/auth/login";
}
