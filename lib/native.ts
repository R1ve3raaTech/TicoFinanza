/**
 * El cerrojo con huella del APK.
 *
 * Es la única parte de la app que le habla al hardware del teléfono. Todo
 * lo demás —incluida la entrada con Google— va por otros caminos; acá solo
 * vive "pedile a Android que confirme que sos vos".
 *
 * **Nada de esto rompe la web.** Sin el envoltorio nativo, cada función
 * contesta "no disponible" y el cerrojo cae al PIN, que es su otro camino
 * de siempre.
 *
 * ### El plugin
 *
 * `@aparajita/capacitor-biometric-auth`. Reemplaza a
 * `capacitor-native-biometric`, contra el que estaba escrito esto antes:
 * aquel pide `@capacitor/core` 3 y está abandonado, y nosotros vamos por
 * el 8. Nunca llegó a correr —se descubrió al revisar, no al fallar—, así
 * que el cambio no rompió nada en producción.
 *
 * Se carga con `import()` dinámico y no arriba del archivo: así su código
 * **no entra en el bundle de la web**, que nunca lo va a usar.
 */

import { hasNativeBridge } from "./nativeBridge";

export { hasNativeBridge } from "./nativeBridge";

export type BiometricResult =
  /** La persona se identificó. */
  | "ok"
  /** Dijo que no, cerró el diálogo, o el dedo no coincidió. Se reintenta. */
  | "cancelado"
  /** Este teléfono no tiene huella ni cara registrada — o no es el APK. */
  | "no-disponible"
  /** Algo se rompió en el camino. */
  | "error";

/**
 * Códigos del plugin que significan "acá no hay con qué abrir".
 *
 * Importa distinguirlos de "canceló": con estos, insistir con la huella no
 * sirve de nada y hay que ofrecer el PIN derecho. Si fueran todos lo mismo,
 * a quien no tiene huella registrada se le quedaría ofreciendo un botón de
 * "probar otra vez" que nunca va a funcionar.
 *
 * `biometryLockout` entra acá a propósito aunque sea temporal: Android se
 * bloquea tras varios intentos fallidos y durante ese rato la huella **no**
 * es un camino. Mandarlo al PIN es exactamente lo correcto.
 */
const SIN_HUELLA = new Set([
  "biometryNotAvailable",
  "biometryNotEnrolled",
  "passcodeNotSet",
  "noDeviceCredential",
  "biometryLockout",
]);

/**
 * Qué hacer ante el código de error del plugin.
 *
 * Está aparte y exportado para poder probarlo: la decisión de a quién se le
 * ofrece el PIN y a quién un botón de reintentar es la parte de esto que
 * más fácil se rompe, y la única que no necesita un teléfono para
 * comprobarse.
 */
export function biometricResultFor(code: unknown): BiometricResult {
  if (typeof code === "string" && SIN_HUELLA.has(code)) return "no-disponible";
  // userCancel, appCancel, systemCancel, userFallback ("Usar PIN") y
  // authenticationFailed (el dedo no coincidió): en todos se queda cerrado,
  // con el botón de reintentar y el PIN si lo tiene.
  return "cancelado";
}

async function plugin() {
  if (!hasNativeBridge()) return null;
  try {
    const { BiometricAuth } = await import("@aparajita/capacitor-biometric-auth");
    return BiometricAuth;
  } catch {
    return null;
  }
}

/** ¿Este teléfono tiene huella o cara registrada? */
export async function biometricsAvailable(): Promise<boolean> {
  const bio = await plugin();
  if (!bio) return false;
  try {
    const { isAvailable } = await bio.checkBiometry();
    return Boolean(isAvailable);
  } catch {
    return false;
  }
}

/**
 * Pide huella o cara.
 *
 * **Distingue "canceló" de "no se puede".** Si fuera un booleano, cancelar
 * a propósito se vería igual que un teléfono sin huella, y la app le
 * ofrecería el PIN a quien solo quiso volver a intentar con el dedo.
 */
export async function unlockWithBiometrics(reason: string): Promise<BiometricResult> {
  const bio = await plugin();
  if (!bio) return "no-disponible";

  try {
    const { isAvailable } = await bio.checkBiometry();
    if (!isAvailable) return "no-disponible";
  } catch {
    return "no-disponible";
  }

  try {
    await bio.authenticate({
      reason,
      androidTitle: "TicoFinanza",
      androidSubtitle: reason,
      cancelTitle: "Usar PIN",
      // **Sin el desbloqueo del teléfono como alternativa.** Suena cómodo y
      // sería un agujero: el cerrojo existe para el caso de que alguien
      // tenga el teléfono ya desbloqueado en la mano, así que aceptar ese
      // mismo desbloqueo como llave lo volvería decorativo.
      allowDeviceCredential: false,
    });
    return "ok";
  } catch (error) {
    return biometricResultFor((error as { code?: unknown })?.code);
  }
}
