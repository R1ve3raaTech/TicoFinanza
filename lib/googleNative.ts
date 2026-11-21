/**
 * Entrada con Google **dentro del APK**.
 *
 * ### Por qué hace falta un camino aparte
 *
 * El flujo de la web manda el navegador a `accounts.google.com`. Dentro del
 * APK ese dominio no es `www.ticofinanza.com`, así que Capacitor se lo
 * entrega al navegador del sistema: la persona entra **en Brave o Chrome**,
 * la cookie de sesión queda ahí, y la app sigue sin sesión. Y si se forzara
 * a que esa página cargue adentro del WebView, Google la rechaza a
 * propósito (`disallowed_useragent`): no entrega su pantalla de inicio de
 * sesión en vistas embebidas.
 *
 * La salida es pedirle el token al sistema operativo (Play Services), que
 * ya conoce las cuentas del teléfono. No se abre ninguna página.
 *
 * ### Lo que NO cambió, que es lo importante
 *
 * El token que devuelve Play Services es **el mismo tipo de `id_token`** que
 * hoy devuelve el flujo web, y se canjea igual: `signInWithIdToken` contra
 * Supabase. Por eso no hubo que tocar nada de Supabase ni del modelo de
 * sesión; esto es una puerta más, no otro sistema de login.
 *
 * ### El `webClientId`, y por qué no es el de Android
 *
 * Se le pasa el ID del cliente **web**, no el de Android. Ese ID es el
 * "público" al que va dirigido el token (`aud`), y es el que el backend ya
 * sabe validar. El cliente de Android no se nombra en ningún lado del
 * código: Google lo usa por detrás para comprobar que quien pide el token
 * es de verdad esta app, firmada con esta llave. Por eso el APK tiene que
 * ir firmado con la llave cuya huella SHA-1 se registró en Google Cloud —
 * con la firma de debug, que el runner genera nueva en cada corrida, esto
 * no funciona.
 *
 * ### El nonce
 *
 * `signInWithIdToken` **hashea** el nonce que recibe y lo compara contra el
 * claim `nonce` del token. Así que a Google hay que mandarle el hash y al
 * servidor el valor crudo — exactamente la misma danza que ya hace
 * `app/auth/login/route.ts`. Mandarle el mismo valor a los dos falla con
 * "Nonces mismatch".
 */

/** Qué pasó al intentar entrar. */
export type NativeSignInResult =
  | { estado: "ok" }
  /** Cerró el selector de cuentas. No es un error: no hay nada que decirle. */
  | { estado: "cancelado" }
  /** No es el APK, o el teléfono no tiene Play Services. */
  | { estado: "no-disponible" }
  | { estado: "error"; motivo: string };

interface CapacitorGlobal {
  isNativePlatform?: () => boolean;
}

/** ¿Estamos dentro del envoltorio nativo? */
export function hasNativeBridge(): boolean {
  if (typeof window === "undefined") return false;
  const cap = (window as unknown as { Capacitor?: CapacitorGlobal }).Capacitor;
  return Boolean(cap?.isNativePlatform?.());
}

/** El hash que Google va a meter en el claim `nonce` del token. */
async function sha256Hex(valor: string): Promise<string> {
  const datos = new TextEncoder().encode(valor);
  const buffer = await crypto.subtle.digest("SHA-256", datos);
  return [...new Uint8Array(buffer)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Pide el token al sistema y lo canjea por una sesión de Supabase.
 *
 * El plugin se carga con `import()` dinámico y no arriba del archivo: así
 * su código **no entra en el bundle de la web**, que nunca lo va a usar.
 */
export async function signInWithGoogleNative(
  webClientId: string
): Promise<NativeSignInResult> {
  if (!hasNativeBridge()) return { estado: "no-disponible" };
  if (!webClientId) return { estado: "error", motivo: "Falta el ID de cliente de Google." };

  try {
    const { SocialLogin } = await import("@capgo/capacitor-social-login");

    const nonceCrudo = crypto.randomUUID();
    const nonceHasheado = await sha256Hex(nonceCrudo);

    await SocialLogin.initialize({ google: { webClientId } });

    const { result } = await SocialLogin.login({
      provider: "google",
      options: { scopes: ["email", "profile"], nonce: nonceHasheado },
    });

    const idToken = (result as { idToken?: string | null }).idToken;
    if (!idToken) {
      return { estado: "error", motivo: "Google no devolvió el token de identidad." };
    }

    // El canje va en el servidor: la sesión se escribe en cookies httpOnly,
    // igual que por el camino de la web. El navegador nunca toca el token
    // de sesión.
    const respuesta = await fetch("/auth/nativo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken, nonce: nonceCrudo }),
    });

    if (!respuesta.ok) {
      return { estado: "error", motivo: "No se pudo abrir la sesión." };
    }
    return { estado: "ok" };
  } catch (error) {
    // El plugin rechaza igual si la persona cierra el selector de cuentas
    // que si algo falla. Se distinguen por el texto porque no hay código:
    // si fuera todo "error", cerrar el selector a propósito mostraría una
    // pantalla roja por algo que la persona decidió.
    const texto = error instanceof Error ? error.message : String(error);
    if (/cancel|closed|dismiss|16:|user_?cancel/i.test(texto)) {
      return { estado: "cancelado" };
    }
    console.error("[googleNative]", texto);
    return { estado: "error", motivo: "No se pudo entrar con Google." };
  }
}
