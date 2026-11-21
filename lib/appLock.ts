/**
 * Cuándo el APK vuelve a pedir el PIN.
 *
 * Es lógica pura y sin dependencias a propósito: la decide el navegador (el
 * cerrojo tiene que poder cerrarse sin señal) y se prueba sola.
 *
 * **Al abrir la app de cero siempre se pide**, salvo que el cerrojo esté
 * apagado. Lo que estas opciones gobiernan es lo otro: qué pasa cuando
 * volvés a la app después de salirte a WhatsApp un momento. Pedirlo cada
 * vez vuelve la app inusable; no pedirlo nunca deja el teléfono abierto
 * toda la tarde para quien lo levante.
 */

/**
 * **"inicio" (solo al abrirla) se quitó.** En la práctica se parecía
 * demasiado a "nunca": con la app viva en segundo plano el cerrojo no se
 * volvía a interponer nunca más. Cuatro opciones además entran en el
 * control segmentado, que es el que usa el resto de Ajustes.
 *
 * La base sigue aceptándolo (check de la 0028): una fila vieja con ese
 * valor cae en el de por defecto al leerse, que es lo que hace
 * `parseLockWhen`.
 */
export type AppLockWhen = "nunca" | "siempre" | "1min" | "5min";

/** Lo que vale si la columna no existe todavía o trae algo raro. */
export const DEFAULT_LOCK_WHEN: AppLockWhen = "1min";

const VALUES: AppLockWhen[] = ["nunca", "siempre", "1min", "5min"];

/**
 * Lee el valor guardado sin confiar en él.
 *
 * La columna es de la migración 0028: en una cuenta vieja, o si la
 * migración no se corrió, llega `undefined`. Y un valor fuera de la lista
 * no debería existir (hay un check en la base), pero si llegara, apagar el
 * cerrojo en silencio sería lo peor que podría hacer.
 */
export function parseLockWhen(value: string | null | undefined): AppLockWhen {
  return VALUES.includes(value as AppLockWhen) ? (value as AppLockWhen) : DEFAULT_LOCK_WHEN;
}

/**
 * Las opciones tal como se ofrecen en Ajustes, de más a menos estricto.
 *
 * Los rótulos son cortos porque van en un control segmentado de cuatro
 * tramos, que a 360px reparte menos de 70px a cada uno.
 */
export const LOCK_OPTIONS: { value: AppLockWhen; label: string }[] = [
  { value: "siempre", label: "Siempre" },
  { value: "1min", label: "1 min" },
  { value: "5min", label: "5 min" },
  { value: "nunca", label: "Nunca" },
];

/** ¿Hay cerrojo? Con "nunca" la app abre directo. */
export function lockEnabled(when: AppLockWhen): boolean {
  return when !== "nunca";
}

/**
 * Al volver la app al frente después de `hiddenMs` en segundo plano,
 * ¿hay que volver a pedir?
 */
export function shouldAskOnReturn(when: AppLockWhen, hiddenMs: number): boolean {
  switch (when) {
    case "nunca":
      return false;
    case "siempre":
      return true;
    case "1min":
      return hiddenMs >= 60_000;
    case "5min":
      return hiddenMs >= 5 * 60_000;
  }
}

/**
 * Qué tan cerrado deja la app cada opción, para saber cuándo un cambio
 * **afloja** el cerrojo.
 *
 * Hace falta porque aflojarlo tiene que costar el PIN. El caso real: te
 * agarran el teléfono con la app recién usada —y por lo tanto abierta—, y
 * desde Ajustes se pasa el cerrojo a "Nunca". Un rato de acceso prestado se
 * convierte así en acceso para siempre. Apretarlo, en cambio, es gratis:
 * nadie se hace daño poniéndose más estricto.
 */
const STRENGTH: Record<AppLockWhen, number> = {
  siempre: 3,
  "1min": 2,
  "5min": 1,
  nunca: 0,
};

/** ¿Pasar de `from` a `to` deja la app menos protegida? */
export function weakensLock(from: AppLockWhen, to: AppLockWhen): boolean {
  return STRENGTH[to] < STRENGTH[from];
}

/** Dígitos de un PIN nuevo. Numérico para que salga el teclado de números. */
export const PIN_LENGTH = 6;

/**
 * **Lo mínimo que se acepta al desbloquear, que no es el largo de un PIN
 * nuevo.**
 *
 * El PIN pasó de cinco dígitos a seis. Un PIN de cinco guardado antes del
 * cambio sigue siendo el PIN de esa persona: si la pantalla de desbloqueo
 * exigiera seis, ese PIN no se podría escribir nunca y la única salida
 * sería el código por correo — o sea, cambiar el largo dejaría a alguien
 * afuera de sus propios datos sin avisar.
 *
 * Al **poner** un PIN siempre se piden seis. Esto solo gobierna lo que la
 * pantalla de desbloqueo deja mandar a verificar.
 */
export const MIN_PIN_LENGTH = 5;

/**
 * Un PIN nuevo: seis dígitos exactos.
 *
 * No es la última defensa: se verifica **en el servidor**, que lleva el
 * límite de intentos. Lo que hace inútil adivinar no es el largo sino que
 * no se pueda probar mil veces por segundo.
 */
export function isValidPin(pin: string): boolean {
  return /^[0-9]+$/.test(pin) && pin.length === PIN_LENGTH;
}

/** ¿Se puede mandar a verificar? Cubre también los PIN viejos de cinco. */
export function isSubmittablePin(pin: string): boolean {
  return (
    /^[0-9]+$/.test(pin) &&
    pin.length >= MIN_PIN_LENGTH &&
    pin.length <= PIN_LENGTH
  );
}

/** Deja solo dígitos y corta al largo. Para lo tecleado y para lo pegado. */
export function cleanPinInput(raw: string): string {
  return raw.replace(/[^0-9]/g, "").slice(0, PIN_LENGTH);
}
