/**
 * Cuándo el APK vuelve a pedir huella o PIN.
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

export type AppLockWhen = "nunca" | "siempre" | "1min" | "5min" | "inicio";

/** Lo que vale si la columna no existe todavía o trae algo raro. */
export const DEFAULT_LOCK_WHEN: AppLockWhen = "1min";

const VALUES: AppLockWhen[] = ["nunca", "siempre", "1min", "5min", "inicio"];

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

/** Las opciones tal como se ofrecen en Ajustes, en orden de más a menos estricto. */
export const LOCK_OPTIONS: { value: AppLockWhen; label: string }[] = [
  { value: "siempre", label: "Siempre" },
  { value: "1min", label: "Al minuto" },
  { value: "5min", label: "A los 5 minutos" },
  { value: "inicio", label: "Solo al abrirla" },
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
    case "inicio":
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
  siempre: 4,
  "1min": 3,
  "5min": 2,
  // Deja de pedir al volver: con la app viva en segundo plano, el cerrojo
  // no se vuelve a interponer. Por eso está apenas encima de apagarlo.
  inicio: 1,
  nunca: 0,
};

/** ¿Pasar de `from` a `to` deja la app menos protegida? */
export function weakensLock(from: AppLockWhen, to: AppLockWhen): boolean {
  return STRENGTH[to] < STRENGTH[from];
}

/** Dígitos exactos del PIN. Numérico para que salga el teclado de números. */
export const PIN_LENGTH = 5;

/**
 * El PIN son cinco dígitos.
 *
 * No es la última defensa: se verifica **en el servidor**, que lleva el
 * límite de intentos. Por eso cinco dígitos alcanzan — lo que hace inútil
 * adivinar no es el largo sino que no se pueda probar mil veces por
 * segundo.
 */
export function isValidPin(pin: string): boolean {
  return new RegExp(`^\\d{${PIN_LENGTH}}$`).test(pin);
}

/** Deja solo dígitos y corta al largo. Para lo tecleado y para lo pegado. */
export function cleanPinInput(raw: string): string {
  return raw.replace(/\D/g, "").slice(0, PIN_LENGTH);
}
