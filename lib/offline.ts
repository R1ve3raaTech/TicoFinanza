import type { MovementInput } from "@/app/dashboard/actions";

/**
 * Cola de movimientos anotados sin señal.
 *
 * El caso real es la soda sin datos: anotás ₡4.200 y la app no puede
 * guardarlos. Perderlos ahí es peor que no tener la app, porque el gasto se
 * olvida y el saldo deja de cuadrar para siempre.
 *
 * Lo que se guarda es la *intención* de crear el movimiento, no el
 * movimiento: la base sigue siendo la única que da ids y saldos. Cuando
 * vuelve la señal se manda la misma Server Action que se habría llamado,
 * así no hay un segundo camino de escritura que pueda validar distinto.
 */

export type PendingStatus = "pending" | "sending" | "failed";

export interface PendingMovement {
  /** Id local, solo para esta cola. No es el id del movimiento. */
  id: string;
  /**
   * Quién lo anotó. IndexedDB es del origen y no de la sesión: en una
   * compu compartida la cola sobrevive al cierre de sesión, y sin dueño
   * lo que anotó una persona se le mostraría a la siguiente y se mandaría
   * a su cuenta.
   */
  userId: string;
  input: MovementInput;
  /** Cuándo se anotó, en milisegundos. Marca el orden de envío. */
  queuedAt: number;
  status: PendingStatus;
  /** Intentos fallidos seguidos. */
  attempts: number;
  /**
   * Cuándo se marchó como "en camino", en milisegundos.
   *
   * Existe para que un envío que nunca terminó no deje el movimiento
   * trabado: ver `STALE_CLAIM_MS`.
   */
  claimedAt?: number;
  /** Último error que devolvió el servidor, si lo rechazó. */
  lastError?: string;
}

/** Después de esto la app deja de reintentar sola y lo dice. */
export const MAX_ATTEMPTS = 5;

/**
 * Distingue "no hay señal" de "el servidor dijo que no".
 *
 * Un fallo de red se reintenta; un rechazo del servidor (monto inválido,
 * cuenta ajena) no mejora por reintentarlo y hay que mostrarlo. Reintentar
 * para siempre algo que nunca va a entrar deja una cola que crece sola.
 */
export function isNetworkFailure(error: unknown): boolean {
  if (typeof navigator !== "undefined" && navigator.onLine === false) return true;
  if (error instanceof TypeError) return true; // fetch caído
  const message = error instanceof Error ? error.message : String(error ?? "");
  return /network|failed to fetch|load failed|offline|net::/i.test(message);
}

/**
 * Un `redirect()` del servidor, no un fallo.
 *
 * Next implementa `redirect()` y `notFound()` lanzando un error con un
 * `digest` propio. Si la sesión venció —y esta app cierra sola a los 15
 * minutos—, la acción redirige a /entrar y eso llega al cliente como una
 * excepción. Tratarla como un rechazo marcaba toda la cola como fallida
 * con el mensaje "NEXT_REDIRECT", que no le dice nada a nadie, y obligaba
 * a reintentar a mano movimientos que no tenían nada malo.
 */
export function isFrameworkNavigation(error: unknown): boolean {
  const digest = (error as { digest?: unknown } | null)?.digest;
  return typeof digest === "string" && digest.startsWith("NEXT_");
}

/**
 * Lo que responde el servidor cuando el movimiento es de otra cuenta.
 *
 * El filtro del navegador no alcanza: `owner` se fija cuando se dibuja la
 * pantalla, y la acción escribe con la cookie del momento. Una pestaña
 * que quedó abierta mientras en otra se cambió de cuenta mandaría los
 * movimientos de la primera persona a la cuenta de la segunda. El único
 * lugar donde eso se puede cortar de verdad es el servidor, que es el que
 * sabe de quién es la sesión.
 *
 * Es un mensaje y no un código porque también se le muestra a la persona
 * en el formulario, donde explica exactamente qué pasó.
 */
export const WRONG_SESSION =
  "La sesión de este navegador cambió. Volvé a entrar con la cuenta que anotó este movimiento.";

export function isWrongSession(error: string | null | undefined): boolean {
  return error === WRONG_SESSION;
}

/** Solo los de esta sesión. Los de otra persona ni se listan ni se mandan. */
export function ownedBy(items: PendingMovement[], userId: string | null): PendingMovement[] {
  if (!userId) return [];
  return items.filter((item) => item.userId === userId);
}

/** Orden de envío: lo que se anotó primero se manda primero. */
export function sendOrder(items: PendingMovement[]): PendingMovement[] {
  return [...items].sort((a, b) => a.queuedAt - b.queuedAt || a.id.localeCompare(b.id));
}

/**
 * Cuánto se le da a un envío antes de darlo por muerto.
 *
 * Un pendiente marcado "en camino" queda fuera de los reintentos para que
 * dos vaciados no lo manden dos veces. El problema es lo que pasa si ese
 * envío **nunca termina**: en el APK, Android mata el proceso en cuanto se
 * desliza la app fuera de recientes, y el movimiento se quedaba en "en
 * camino" para siempre — ni se reintentaba (lo saltaba `sendable`) ni
 * salía como atascado (`stuck` mira los intentos, que seguían en cero), así
 * que la única salida era descartarlo, o sea perder el gasto.
 *
 * Dos minutos es mucho más de lo que tarda una Server Action y mucho
 * menos de lo que tarda alguien en volver a abrir la app, así que no le
 * roba el turno a una pestaña que de verdad está mandando. Y si se lo
 * robara, la clave de deduplicación (`clientId`, índice único de la
 * migración 0024) hace que el segundo envío no inserte nada.
 */
export const STALE_CLAIM_MS = 120_000;

/** Un "en camino" tan viejo que el envío ya no puede estar vivo. */
export function isStaleClaim(item: PendingMovement, now: number = Date.now()): boolean {
  if (item.status !== "sending") return false;
  // Sin marca es de antes de que esto existiera: se da por muerto.
  if (typeof item.claimedAt !== "number") return true;
  return now - item.claimedAt >= STALE_CLAIM_MS;
}

/** Los que todavía tiene sentido intentar. */
export function sendable(items: PendingMovement[], now: number = Date.now()): PendingMovement[] {
  return sendOrder(items).filter(
    (item) =>
      item.attempts < MAX_ATTEMPTS &&
      (item.status !== "sending" || isStaleClaim(item, now))
  );
}

/** Los que ya no se reintentan solos: necesitan que alguien los mire. */
export function stuck(items: PendingMovement[]): PendingMovement[] {
  return sendOrder(items).filter((item) => item.attempts >= MAX_ATTEMPTS);
}

export function pendingLabel(count: number): string {
  if (count === 1) return "1 movimiento sin enviar";
  return `${count} movimientos sin enviar`;
}

/**
 * Cuánto suma la cola, con los gastos en negativo.
 *
 * Sirve para avisar que el saldo que se está mirando todavía no incluye
 * esto: un número sin contexto en una app de plata es exactamente lo que
 * hace desconfiar de todos los demás.
 */
export function pendingNet(items: PendingMovement[]): number {
  return items.reduce(
    (total, item) => total + (item.input.type === "INCOME" ? item.input.amount : -item.input.amount),
    0
  );
}

/**
 * Id local. `crypto.randomUUID` existe en todo navegador con IndexedDB y en
 * contexto seguro, que es donde corre la app; el respaldo es para los
 * entornos donde no hay (pruebas, un WebView viejo).
 */
export function localId(): string {
  const c = globalThis.crypto;
  if (c && typeof c.randomUUID === "function") return c.randomUUID();
  return `local-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
