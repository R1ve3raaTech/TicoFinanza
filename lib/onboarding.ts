/**
 * Si a esta cuenta le toca ver la guía de bienvenida.
 *
 * Vive aparte y con pruebas porque los tres casos se confunden fácil, y
 * confundirlos tiene las dos consecuencias caras: o la guía no le sale a
 * quien se acaba de registrar (que fue el fallo real), o le traba la
 * pantalla diez segundos a todo el mundo en cada carga.
 */
export function shouldShowWelcome(
  settings: { onboarding_seen?: boolean | null } | null | undefined
): boolean {
  // Sin fila de ajustes la cuenta es nueva: `handle_new_user` crea el
  // perfil y una cuenta de efectivo, pero no esta fila —aparece recién
  // cuando alguien toca el tema o los recordatorios—.
  if (settings === null || settings === undefined) return true;
  // Con fila pero sin la columna, la migración 0026 no se corrió: no se
  // muestra, porque no habría dónde anotar que ya se vio y saldría siempre.
  if (settings.onboarding_seen === undefined) return false;
  return settings.onboarding_seen === false;
}
