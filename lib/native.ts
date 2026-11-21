/**
 * El único punto donde la web le habla al envoltorio nativo de Android.
 *
 * Todo lo que necesita código nativo pasa por acá, y por nada más. La razón
 * es que hoy ese código **todavía no existe**: el APK publicado es un TWA y
 * el envoltorio de Capacitor se arma después. Con una sola puerta, el día
 * que se arme hay un archivo que tocar y no quince componentes.
 *
 * Mientras tanto nada de esto rompe la web: sin Capacitor, cada función
 * contesta "no disponible" y la app sigue por el otro camino (el PIN).
 */

export type BiometricResult =
  /** La persona se identificó. */
  | "ok"
  /** Dijo que no, o cerró el diálogo del sistema. */
  | "cancelado"
  /** Este dispositivo no tiene huella ni cara registrada — o no es el APK. */
  | "no-disponible"
  /** Algo se rompió en el camino. */
  | "error";

/**
 * Forma mínima del plugin que vamos a usar (`capacitor-native-biometric`).
 * Se declara acá en vez de importar el paquete porque el paquete todavía no
 * está instalado: esto tiene que compilar igual.
 */
interface NativeBiometricPlugin {
  isAvailable(): Promise<{ isAvailable: boolean }>;
  verifyIdentity(options: {
    reason?: string;
    title?: string;
    subtitle?: string;
    description?: string;
  }): Promise<void>;
}

interface CapacitorGlobal {
  Plugins?: { NativeBiometric?: NativeBiometricPlugin };
}

function capacitor(): CapacitorGlobal | undefined {
  if (typeof window === "undefined") return undefined;
  return (window as unknown as { Capacitor?: CapacitorGlobal }).Capacitor;
}

/**
 * ¿Estamos corriendo dentro del envoltorio nativo?
 *
 * Se reexporta desde `lib/nativeBridge.ts`, que es donde vive el criterio.
 * **No volver a escribirlo acá**: tenerlo copiado, y mirando
 * `window.Capacitor` en vez de `androidBridge`, es lo que hizo que la
 * entrada con Google se fuera al navegador adentro del APK.
 */
export { hasNativeBridge } from "./nativeBridge";

/** ¿Este teléfono tiene huella o cara registrada? */
export async function biometricsAvailable(): Promise<boolean> {
  const plugin = capacitor()?.Plugins?.NativeBiometric;
  if (!plugin) return false;
  try {
    const { isAvailable } = await plugin.isAvailable();
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
  const plugin = capacitor()?.Plugins?.NativeBiometric;
  if (!plugin) return "no-disponible";

  try {
    const { isAvailable } = await plugin.isAvailable();
    if (!isAvailable) return "no-disponible";
  } catch {
    return "no-disponible";
  }

  try {
    await plugin.verifyIdentity({ reason, title: "TicoFinanza", subtitle: reason });
    return "ok";
  } catch {
    // El plugin rechaza tanto si la persona cancela como si la huella no
    // coincide. Para el cerrojo es lo mismo: no se abre y se puede
    // reintentar o pasar al PIN.
    return "cancelado";
  }
}
