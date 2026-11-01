/**
 * Cierre de sesión por inactividad.
 *
 * Es una app de plata que mucha gente abre en una compu compartida o en la
 * del trabajo: una pestaña olvidada abierta es la forma más común de que
 * otro vea tus movimientos. A los 15 minutos sin tocar nada se cierra la
 * sesión sola.
 *
 * La cuenta va contra una marca de tiempo guardada, no contra un
 * `setTimeout`: si la máquina se suspende, el temporizador se congela con
 * ella y al despertar la sesión seguiría abierta como si nada. Comparando
 * contra el reloj, una compu que durmió dos horas aparece vencida apenas se
 * despierta.
 */

/** Quince minutos sin actividad y se cierra la sesión. */
export const IDLE_TIMEOUT_MS = 15 * 60_000;

/**
 * El aviso sale un minuto antes. Sin aviso, alguien que estaba leyendo (sin
 * tocar el mouse) pierde lo que estaba escribiendo en un formulario sin
 * entender por qué.
 */
export const IDLE_WARNING_MS = 60_000;

/**
 * La última actividad se comparte entre pestañas por `localStorage`: si no,
 * la pestaña de atrás se vence sola mientras trabajás en la de adelante y
 * te saca de las dos.
 */
export const IDLE_ACTIVITY_KEY = "ticofinanza:ultima-actividad";

export type IdlePhase = "activa" | "por-vencer" | "vencida";

export function idlePhase(idleMs: number): IdlePhase {
  if (idleMs >= IDLE_TIMEOUT_MS) return "vencida";
  if (idleMs >= IDLE_TIMEOUT_MS - IDLE_WARNING_MS) return "por-vencer";
  return "activa";
}

/** Segundos que faltan para el cierre. Nunca negativo. */
export function secondsUntilLogout(idleMs: number): number {
  return Math.max(0, Math.ceil((IDLE_TIMEOUT_MS - idleMs) / 1000));
}

/**
 * La actividad más reciente entre esta pestaña y la que haya anotado otra.
 *
 * Un valor guardado que está en el futuro se descarta: puede venir de un
 * reloj desajustado, y aceptarlo dejaría la sesión abierta para siempre.
 */
export function mostRecentActivity(local: number, stored: string | null, now: number): number {
  const parsed = stored === null ? NaN : Number(stored);
  if (!Number.isFinite(parsed) || parsed > now) return local;
  return Math.max(local, parsed);
}
