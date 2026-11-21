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
  /**
   * **Respuesta definitiva**: este teléfono no tiene huella ni cara
   * registrada, o no es el APK.
   *
   * Es el único valor con el que el cerrojo **se abre solo** cuando
   * tampoco hay PIN puesto (`AppLockGate`), porque ahí de verdad no hay
   * con qué cerrar y trabar a alguien afuera de sus propios datos sería
   * peor. Por eso mismo **no puede significar nada más**: cualquier otra
   * cosa —un fallo, un bloqueo temporal, un plugin que no carga— tiene que
   * dejar el cerrojo puesto.
   */
  | "no-disponible"
  /** Algo se rompió en el camino. Se queda cerrado. */
  | "error";

/**
 * Códigos que significan **"acá no hay con qué abrir, y no va a cambiar"**.
 *
 * La lista es corta a propósito y no hay que ensancharla sin pensarlo: con
 * estos valores, y sin PIN puesto, el cerrojo **se abre**. Es la única
 * puerta de ese tipo en la app.
 *
 * **Dos códigos estuvieron acá y eran agujeros, cada uno por su lado.**
 * Vale la pena dejar escrito el porqué, porque el patrón se repite:
 *
 * - `biometryLockout` lo tira Android tras varios intentos fallidos. Es
 *   temporal, así que mi razonamiento fue "durante ese rato la huella no
 *   es un camino, al PIN". Correcto mientras haya PIN; catastrófico
 *   cuando no lo hay, porque entonces el mismo valor quiere decir "dejalo
 *   entrar". Fallar la huella cinco veces abría la app.
 * - `biometryNotAvailable` parecía definitivo por el nombre, y no lo es:
 *   leyendo el Android del plugin, **ahí caen tres cosas distintas** —
 *   `ERROR_HW_NOT_PRESENT` (no hay sensor, permanente),
 *   `ERROR_HW_UNAVAILABLE` ("el sensor existe pero ahora no está
 *   disponible", temporal) y, por el `default` del mapa,
 *   `BIOMETRIC_STATUS_UNKNOWN` ("no se pudo determinar"). Abrir la app
 *   ante un "no sé" es exactamente lo que no hay que hacer.
 *
 * Para el caso legítimo que ese código cubría —un teléfono sin sensor— se
 * usa otra señal, que sí es inequívoca: `biometryType`, que el plugin saca
 * de las capacidades del hardware (`hasSystemFeature`) y no del estado del
 * momento.
 */
const SIN_HUELLA = new Set([
  "biometryNotEnrolled",
  "passcodeNotSet",
  "noDeviceCredential",
]);

/**
 * `BiometryType.none`. El teléfono no tiene ningún sensor biométrico.
 *
 * Esto sí es una respuesta sobre el hardware y no sobre el momento: sale
 * de `hasSystemFeature(FINGERPRINT | FACE | IRIS)`, así que no cambia
 * porque el sensor esté ocupado ni porque alguien haya fallado el dedo.
 */
const SIN_SENSOR = 0;

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
  // Cancelar, fallar el dedo, un bloqueo temporal, un sensor ocupado, un
  // estado que no se pudo determinar: en todos se queda cerrado, con el
  // botón de reintentar y el PIN si lo tiene.
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

/**
 * Pide huella o cara.
 *
 * **Distingue "canceló" de "no se puede".** Si fuera un booleano, cancelar
 * a propósito se vería igual que un teléfono sin huella, y la app le
 * ofrecería el PIN a quien solo quiso volver a intentar con el dedo.
 */
export async function unlockWithBiometrics(reason: string): Promise<BiometricResult> {
  // Fuera del APK no hay nada que preguntar y el PIN es el único camino:
  // esa sí es una respuesta definitiva.
  if (!hasNativeBridge()) return "no-disponible";

  const bio = await plugin();
  // **Adentro del APK, un plugin que no carga es un error, no una
  // ausencia.** Devolver "no-disponible" acá dejaba entrar a quien no
  // tuviera PIN, por una falla nuestra y sin que nadie se enterara.
  if (!bio) return "error";

  try {
    const info = await bio.checkBiometry();

    // Sin sensor en el teléfono no hay nada que preguntar, ahora ni nunca.
    // Es la única comprobación de "no se puede" que mira el hardware en vez
    // del estado del momento, y por eso es la única en la que se puede
    // confiar para abrir.
    if (info.biometryType === SIN_SENSOR) return "no-disponible";

    if (!info.isAvailable) {
      // **`isAvailable: false` por sí solo no dice que no haya huella.**
      // También sale así cuando Android tiene la huella bloqueada por
      // intentos fallidos, o cuando el hardware está ocupado. Tomarlo como
      // "no hay huella" reabría el mismo agujero por otra puerta: fallar
      // cinco veces y volver a entrar abría la app de quien no tiene PIN.
      //
      // Por eso se mira el `code`, que es justamente el campo donde el
      // plugin explica el motivo, y se pasa por la misma tabla que los
      // errores de `authenticate()`. Una sola regla para las dos puertas:
      // si se agrega un caso, vale para ambas. Tenerlas separadas ya fue
      // un bug una vez.
      return biometricResultFor(info.code);
    }
  } catch {
    // Preguntar falló. No sabemos si hay huella o no, así que no se abre.
    return "error";
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
