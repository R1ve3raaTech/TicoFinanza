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
 * ### Por qué se importa arriba y no con `import()` dinámico
 *
 * El dinámico era más fino —el código no entraba en el bundle de la web—
 * y estaba mal: **bajaba el lector justo en el momento de desbloquear**, y
 * ese momento es, muchas veces, sin señal o con una pésima. Si ese pedazo
 * no estaba ya guardado, la pantalla se quedaba en "Abriendo el lector de
 * huella..." esperando una descarga que no llegaba, con la persona afuera
 * de sus propios datos.
 *
 * Importado arriba, viaja dentro de la página, que el Service Worker ya
 * guarda entera. El costo son unos pocos KB en la web, que nunca lo usa.
 * Es un intercambio claramente bueno: un cerrojo que depende de la red
 * para abrirse no es un cerrojo, es una tranca.
 */

import { BiometricAuth } from "@aparajita/capacitor-biometric-auth";
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
 * `BiometryType.none`. El teléfono no declara ningún sensor biométrico.
 *
 * Es una respuesta sobre el hardware y no sobre el momento: sale de
 * `hasSystemFeature(FINGERPRINT | FACE | IRIS)`, así que no cambia porque
 * el sensor esté ocupado ni porque alguien haya fallado el dedo.
 *
 * **Pero no alcanza sola**, y eso costó una vuelta: Android es inconsistente
 * declarando esas características —hay teléfonos con reconocimiento facial
 * que no declaran `FEATURE_FACE`—, así que un `none` puede convivir con una
 * biometría que funciona perfectamente. Solo cuenta cuando el sistema
 * *además* dice que no se puede usar. Ver `decidirDisponibilidad`.
 */
const SIN_SENSOR = 0;

/** Lo que `checkBiometry()` contesta, de lo que acá se mira. */
export interface EstadoBiometria {
  /** El sistema dice que se puede pedir huella ahora mismo. */
  isAvailable: boolean;
  /** Qué sensores declara el teléfono (0 = ninguno). */
  biometryType?: number;
  /** Por qué no se puede, cuando `isAvailable` es falso. */
  code?: unknown;
}

/** Qué hacer después de preguntarle al sistema por la biometría. */
export type DecisionBiometria =
  /** Se puede pedir el dedo. */
  | "pedir"
  /** No hay con qué: sin PIN, el cerrojo se abre. */
  | "no-disponible"
  /** No se puede ahora, o no se sabe: queda cerrado. */
  | "cancelado";

/**
 * La decisión completa, en una función pura para poder probarla.
 *
 * Sin esto, lo único verificable eran los códigos sueltos y el orden de las
 * comprobaciones quedaba fuera de toda prueba — que es justo donde apareció
 * el último fallo.
 *
 * **El orden importa**: `isAvailable` manda sobre todo lo demás. Si el
 * sistema dice que la huella se puede usar, se pide, aunque el teléfono no
 * declare ningún sensor. Tenerlo al revés hacía que un teléfono con
 * reconocimiento facial no declarado abriera la app **sin preguntar nada**.
 */
export function decidirDisponibilidad(
  info: EstadoBiometria,
): DecisionBiometria {
  // Lo primero y lo que manda: si se puede, se pide.
  if (info.isAvailable) return "pedir";

  // No se puede. ¿El motivo es definitivo?
  if (biometricResultFor(info.code) === "no-disponible") return "no-disponible";

  // El motivo no es concluyente (sensor ocupado, estado desconocido,
  // bloqueo por intentos). Solo se abre si además el teléfono no declara
  // ningún sensor —las dos señales de acuerdo— y el motivo no es un
  // bloqueo, que siempre quiere decir que biometría hay.
  if (info.biometryType === SIN_SENSOR && info.code !== "biometryLockout") {
    return "no-disponible";
  }

  return "cancelado";
}

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

/**
 * Un tope para los pasos que **no** esperan a una persona.
 *
 * Cargar el plugin y preguntarle al sistema si hay huella tienen que
 * tardar milisegundos. Si no contestan, algo se rompió, y quedarse
 * esperando para siempre deja la pantalla del cerrojo diciendo "esperando
 * tu huella..." sin que nunca aparezca nada.
 *
 * **`authenticate()` no lleva tope a propósito**: ese sí espera a que
 * alguien ponga el dedo, y cortarlo a los N segundos sería cancelar la
 * decisión de la persona por reloj. Lo que cubre ese caso es que la
 * pantalla deja siempre el PIN a mano.
 */
function conTope<T>(
  promesa: Promise<T>,
  ms: number,
  etapa: string,
): Promise<T> {
  return Promise.race([
    promesa,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`sin respuesta al ${etapa}`)), ms),
    ),
  ]);
}

/**
 * El lector, si estamos adentro del APK.
 *
 * Sigue siendo una función y no una constante porque `hasNativeBridge()`
 * solo tiene respuesta en el navegador: en el servidor, durante el
 * renderizado, no hay ningún puente.
 */
function plugin() {
  return hasNativeBridge() ? BiometricAuth : null;
}

/**
 * Espera a que el puente nativo aparezca, hasta `ms`.
 *
 * **El arranque en frío es una carrera.** Android inyecta `androidBridge`
 * en el contexto de la página, y el cerrojo pregunta por él en cuanto
 * React monta. Si pregunta un instante antes, `hasNativeBridge()` contesta
 * que no —que es lo mismo que contesta la web— y el cerrojo concluye que
 * no hay con qué abrir. Sin PIN puesto, esa conclusión **abre la app sin
 * preguntar nada**, en silencio y sin dejar rastro: exactamente el
 * síntoma de "no me pide huella nunca".
 *
 * Desde un botón de Ajustes el puente lleva rato listo, y por eso ahí la
 * huella siempre funcionó. La diferencia no estaba en el lector.
 *
 * Esperar un poco no cuesta nada: si de verdad es la web, el puente no va
 * a aparecer nunca y se pierden unos milisegundos una sola vez; si es el
 * APK, se gana la respuesta correcta.
 */
async function esperarPuente(ms: number): Promise<boolean> {
  const hasta = Date.now() + ms;
  while (!hasNativeBridge()) {
    if (Date.now() >= hasta) return false;
    await new Promise((r) => setTimeout(r, 50));
  }
  return true;
}

/**
 * Pide huella o cara.
 *
 * **Distingue "canceló" de "no se puede".** Si fuera un booleano, cancelar
 * a propósito se vería igual que un teléfono sin huella, y la app le
 * ofrecería el PIN a quien solo quiso volver a intentar con el dedo.
 */
export interface IntentoBiometrico {
  estado: BiometricResult;
  /**
   * Qué pasó, cuando no fue lo esperado. **Va a la pantalla, no solo al
   * registro**: dentro del APK no hay consola a la que asomarse, y un
   * cerrojo que falla en silencio no se puede arreglar. Es la misma
   * lección que la entrada con Google.
   */
  detalle?: string;
}

/**
 * En qué paso va el intento. Se informa hacia afuera para que la pantalla
 * lo muestre: un cerrojo que dice "esperando tu huella..." para siempre no
 * deja ver si lo que falla es cargar el lector, consultarlo o el diálogo
 * del sistema, y sin eso no hay forma de arreglarlo desde acá.
 */
export type EtapaBiometria = "cargando" | "consultando" | "esperando";

/**
 * Cuánto se le da al puente nativo para aparecer en el arranque en frío.
 *
 * Generoso a propósito: el costo de esperar de más es un instante en la
 * pantalla del cerrojo, que de todos modos está esperando a una persona.
 * El costo de esperar de menos es abrir la app sin identificar a nadie.
 */
const ESPERA_PUENTE_MS = 3000;

export async function unlockWithBiometrics(
  reason: string,
  onEtapa?: (etapa: EtapaBiometria) => void,
): Promise<IntentoBiometrico> {
  onEtapa?.("cargando");
  // Fuera del APK no hay nada que preguntar y el PIN es el único camino:
  // esa sí es una respuesta definitiva. Pero **solo después de darle al
  // puente la oportunidad de aparecer**: en el arranque en frío puede no
  // estar todavía, y darlo por ausente abre la app sin preguntar.
  if (!(await esperarPuente(ESPERA_PUENTE_MS))) {
    return { estado: "no-disponible" };
  }

  const bio = plugin();
  // **Adentro del APK, un plugin que no carga es un error, no una
  // ausencia.** Devolver "no-disponible" acá dejaba entrar a quien no
  // tuviera PIN, por una falla nuestra y sin que nadie se enterara.
  if (!bio) {
    return {
      estado: "error",
      detalle: "No se pudo cargar el lector de huella.",
    };
  }

  onEtapa?.("consultando");
  try {
    const estado = await conTope(
      bio.checkBiometry(),
      8000,
      "consultar la huella",
    );
    const decision = decidirDisponibilidad(estado);
    if (decision !== "pedir") return { estado: decision };
  } catch (error) {
    // Preguntar falló. No sabemos si hay huella o no, así que no se abre.
    return { estado: "error", detalle: textoDe(error) };
  }

  onEtapa?.("esperando");
  try {
    await conTope(
      bio.authenticate({
        reason,
        androidTitle: "TicoFinanza",
        androidSubtitle: reason,
        cancelTitle: "Usar PIN",
        // **Sin el desbloqueo del teléfono como alternativa.** Suena cómodo y
        // sería un agujero: el cerrojo existe para el caso de que alguien
        // tenga el teléfono ya desbloqueado en la mano, así que aceptar ese
        // mismo desbloqueo como llave lo volvería decorativo.
        allowDeviceCredential: false,
      }),
      // **Tope largo y a propósito.** Este paso sí espera a una persona,
      // así que cortarlo rápido sería cancelarle la decisión. Pero sin
      // ningún tope, un diálogo del sistema que nunca aparece deja la
      // pantalla girando para siempre — y a quien no tenga PIN, afuera de
      // sus propios datos. Un minuto es más de lo que nadie tarda en poner
      // el dedo, y mucho menos que "nunca".
      60000,
      "mostrar el diálogo de huella",
    );
    return { estado: "ok" };
  } catch (error) {
    const estado = biometricResultFor((error as { code?: unknown })?.code);
    // Si canceló, no hay nada que contarle: fue su decisión.
    if (estado === "cancelado" && esCancelacion(error)) return { estado };
    return { estado, detalle: textoDe(error) };
  }
}

/** Códigos que son una decisión de la persona, no una falla. */
function esCancelacion(error: unknown): boolean {
  const code = (error as { code?: unknown })?.code;
  return (
    typeof code === "string" &&
    [
      "userCancel",
      "appCancel",
      "systemCancel",
      "userFallback",
      "authenticationFailed",
    ].includes(code)
  );
}

/** El motivo, recortado: algunos mensajes de Android son larguísimos. */
function textoDe(error: unknown): string {
  const base = error instanceof Error ? error.message : String(error);
  const code = (error as { code?: unknown })?.code;
  const texto = typeof code === "string" && code ? `${code}: ${base}` : base;
  return texto.replace(/\s+/g, " ").trim().slice(0, 160);
}

/**
 * Qué contesta el lector, en una línea que se pueda leer en pantalla.
 *
 * **Existe porque adentro del APK no hay consola a la que asomarse.** Es la
 * misma lección que dejó la entrada con Google y el primer intento del
 * cerrojo: un fallo que no se ve no se puede arreglar, y las dos veces que
 * se mostró el motivo en pantalla el problema se resolvió en un intento.
 *
 * No decide nada: solo cuenta lo que hay. La decisión sigue estando en
 * `decidirDisponibilidad`, que es la que tiene pruebas.
 */
export async function diagnosticoBiometria(): Promise<string> {
  const puente = hasNativeBridge();
  if (!puente) {
    // Puede ser la web (respuesta correcta) o el APK preguntando
    // demasiado pronto, que era el bug.
    const aparecio = await esperarPuente(ESPERA_PUENTE_MS);
    if (!aparecio) return "Puente nativo: no (esto es la web, no el APK)";
  }

  const bio = plugin();
  if (!bio) return "Puente nativo: sí · el plugin no cargó";

  try {
    const estado = await conTope(bio.checkBiometry(), 8000, "consultar");
    const partes = [
      `Puente: sí${puente ? "" : " (tardó en aparecer)"}`,
      `disponible: ${estado.isAvailable ? "sí" : "no"}`,
      `sensores: ${estado.biometryType ?? "?"}`,
      `motivo: ${estado.code ?? "ninguno"}`,
      `decisión: ${decidirDisponibilidad(estado)}`,
    ];
    return partes.join(" · ");
  } catch (error) {
    return `Puente: sí · falló al consultar · ${textoDe(error)}`;
  }
}
