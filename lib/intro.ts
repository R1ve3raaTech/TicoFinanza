/**
 * Que la bienvenida del APK ya se vio.
 *
 * Va en una **cookie** y no en `localStorage` porque quien tiene que
 * decidir es el servidor: entrar a `/` dentro del APK lleva a la bienvenida
 * o al login, y esa decisión se toma antes de dibujar nada. Con
 * `localStorage` habría que dibujar primero y corregir después, y se vería
 * el parpadeo.
 *
 * Es del dispositivo y no de la cuenta a propósito: se ve **antes** de
 * entrar, cuando todavía no hay cuenta donde anotarlo. (La guía de adentro
 * sí es de la cuenta: esa es `onboarding_seen`, otra cosa.)
 */
export const INTRO_COOKIE = "tf_intro";

/** Un año. Se ve una vez; si vuelve a salir dentro de un año, algo pasó. */
const INTRO_MAX_AGE = 60 * 60 * 24 * 365;

export function introSeen(value: string | null | undefined): boolean {
  return value === "1";
}

/** Marca la bienvenida como vista, desde el navegador. */
export function markIntroSeen(): void {
  if (typeof document === "undefined") return;
  try {
    document.cookie = `${INTRO_COOKIE}=1; path=/; max-age=${INTRO_MAX_AGE}; SameSite=Lax`;
  } catch {
    // Sin cookies la bienvenida vuelve a salir. Molesto, no roto.
  }
}
