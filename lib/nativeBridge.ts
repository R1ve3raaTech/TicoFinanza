/**
 * Cómo se reconoce que estamos corriendo dentro del APK.
 *
 * Vive en su propio archivo porque **hay más de un lugar que lo pregunta**
 * (la entrada con Google y el cerrojo con huella) y tenerlo copiado fue
 * exactamente lo que falló: dos comprobaciones que miraban cosas distintas,
 * y la de Google miraba la equivocada.
 *
 * ### Lo que hay que mirar es `androidBridge`
 *
 * `window.Capacitor` lo **crea el JavaScript** de `@capacitor/core`, que en
 * una app empacada viene en su `index.html`. Esta app carga el sitio en
 * vivo (`server.url`), así que la página es nuestro HTML de Next y no trae
 * ese script: `window.Capacitor` no existe hasta que algún `import()` lo
 * crea. Lo que Android inyecta siempre desde el lado nativo
 * (`addJavascriptInterface`) es `androidBridge` — y por eso mismo
 * `@capacitor/core` lo usa para reconocer la plataforma.
 *
 * El bug que esto corrige: adentro del APK la detección daba `false`, el
 * botón de Google se iba por el camino de la web y el login terminaba en
 * Brave, con la app sin sesión.
 */

/** Lo mínimo que hace falta mirar de `window`. */
export interface PosibleGlobal {
  /** Lo que Android inyecta de verdad. */
  androidBridge?: unknown;
  /** Lo que crea el JS de `@capacitor/core`, si llegó a cargarse. */
  Capacitor?: { isNativePlatform?: () => boolean };
}

/** ¿Estamos dentro del envoltorio nativo? */
export function hasNativeBridge(
  global: PosibleGlobal | undefined = globalThis as PosibleGlobal
): boolean {
  if (!global) return false;
  if (global.androidBridge) return true;
  return Boolean(global.Capacitor?.isNativePlatform?.());
}
