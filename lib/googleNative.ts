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
 * ### El nonce lo pone el servidor, y es importante que así sea
 *
 * Primero se le pide a `/auth/nativo` (GET), que devuelve el **hash** y se
 * guarda el valor crudo en una cookie httpOnly. El hash es lo que se le
 * manda a Google; el crudo no lo ve nunca este código.
 *
 * Generarlo acá sería más corto y estaría mal: si el navegador manda el
 * token *y* el nonce que le corresponde, un atacante puede mandar los dos
 * suyos y la comprobación no comprueba nada. Con el nonce del lado del
 * servidor, puede traer su token pero no puede hacer que ese token lleve
 * adentro un nonce que no conoce. Es el agujero de login CSRF que tuvo la
 * primera versión de esto; está contado entero en `app/auth/nativo/route.ts`.
 */

/** Qué pasó al intentar entrar. */
export type NativeSignInResult =
  | { estado: "ok" }
  /** Cerró el selector de cuentas. No es un error: no hay nada que decirle. */
  | { estado: "cancelado" }
  /** No es el APK, o el teléfono no tiene Play Services. */
  | { estado: "no-disponible" }
  | { estado: "error"; motivo: string };

import { hasNativeBridge } from "./nativeBridge";

export { hasNativeBridge } from "./nativeBridge";

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
    // Confirmación de segunda mano: ya cargado el core, él mismo dice en
    // qué plataforma está. Si dijera que no es nativa, mejor caer al camino
    // de la web que quedarse esperando un plugin que no va a contestar.
    const { Capacitor } = await import("@capacitor/core");
    if (!Capacitor.isNativePlatform()) return { estado: "no-disponible" };

    const { SocialLogin } = await import("@capgo/capacitor-social-login");

    // El nonce de este intento. Viene del servidor, que se queda con el
    // valor crudo en una cookie que este código no puede leer.
    const pedido = await fetch("/auth/nativo", {
      method: "GET",
      headers: { Accept: "application/json" },
    });
    if (!pedido.ok) {
      return { estado: "error", motivo: "No se pudo empezar el inicio de sesión." };
    }
    const { nonce } = (await pedido.json()) as { nonce?: string };
    if (!nonce) {
      return { estado: "error", motivo: "No se pudo empezar el inicio de sesión." };
    }

    await SocialLogin.initialize({ google: { webClientId } });

    const { result } = await SocialLogin.login({
      provider: "google",
      options: { scopes: ["email", "profile"], nonce },
    });

    const idToken = (result as { idToken?: string | null }).idToken;
    if (!idToken) {
      return { estado: "error", motivo: "Google no devolvió el token de identidad." };
    }

    // El canje va en el servidor: la sesión se escribe en cookies httpOnly,
    // igual que por el camino de la web. El navegador nunca toca el token
    // de sesión. El nonce no se manda: el servidor ya lo tiene en su
    // cookie, que es justo lo que lo hace servir de algo.
    const respuesta = await fetch("/auth/nativo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken }),
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
