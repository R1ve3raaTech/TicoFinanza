/**
 * ¿Esto se está viendo dentro del APK de Android, o en la web?
 *
 * El APK y la web sirven **el mismo sitio**: el envoltorio de Capacitor
 * carga `www.ticofinanza.com` en vivo, que es lo que hace que un cambio en
 * la web salga en el Android sin recompilar nada. Así que la app tiene que
 * poder distinguirlos, porque se comportan distinto en tres cosas:
 *
 * - La portada **no existe** en el APK: entrar a `/` lleva a la bienvenida
 *   o al resumen, nunca a la página que vende el producto.
 * - El cierre de sesión por inactividad **no corre** en el APK: ahí la
 *   sesión se queda viva y lo que protege es el cerrojo con huella o PIN.
 * - El cerrojo, al revés, **solo** existe en el APK.
 *
 * La marca viaja en el identificador del navegador (`appendUserAgent` de
 * Capacitor). Se eligió eso y no una cookie ni un parámetro de URL porque
 * el encabezado llega en **toda** petición, incluida la primera y las de
 * React Server Components: el servidor puede decidir antes de dibujar, y no
 * hay un instante en que se vea la portada y después se corrija sola.
 *
 * **No es un control de seguridad.** Cualquiera puede falsear su
 * identificador desde un navegador y decirle a la app que es el APK. Lo
 * único que consigue es ver la bienvenida en vez de la portada y que se le
 * pida un PIN que no tiene puesto; no hay nada que se abra por este camino.
 * Por eso nada de lo que protege datos cuelga de acá.
 */

/**
 * La marca que el envoltorio de Capacitor agrega a su identificador.
 *
 * Tiene que coincidir con `appendUserAgent` en `capacitor.config.ts`. Si se
 * cambia de un lado y no del otro, el APK pasa a comportarse como la web:
 * mostraría la portada y perdería el cerrojo.
 */
export const APP_UA_MARKER = "TicoFinanzaApp";

/** `true` si ese identificador es el del APK. */
export function isAppUserAgent(userAgent: string | null | undefined): boolean {
  if (!userAgent) return false;
  return userAgent.includes(APP_UA_MARKER);
}
