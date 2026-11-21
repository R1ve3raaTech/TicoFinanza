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
 *   sesión se queda viva y lo que protege es el cerrojo con PIN.
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

/**
 * El nombre de la cookie que confirma que esto es el APK.
 *
 * **Existe porque la marca del identificador no siempre llega.** El
 * WebView de Android la agrega a sus pedidos, pero **los que nacen dentro
 * del Service Worker salen con el identificador de fábrica**: ese contexto
 * tiene sus propios ajustes (`ServiceWorkerWebSettings`) y Android no
 * ofrece forma de copiarle el identificador del WebView. Como las
 * pantallas de la app pasan por el Service Worker —es lo que las guarda
 * para abrirlas sin señal—, el servidor las veía llegar como si fueran la
 * web: sin cerrojo, sin avisos por Firebase, con la portada en la raíz.
 *
 * La cookie no tiene ese problema: viaja en todo pedido al mismo dominio,
 * nazca donde nazca. La pone el navegador cuando reconoce el puente
 * nativo, que es la señal de verdad — y **no** la marca del identificador,
 * que es solo un texto que cualquier intermediario puede no reenviar.
 *
 * **No es un control de seguridad.** Falsearla solo le muestra a alguien
 * la bienvenida de la app en vez de la portada.
 */
export const APP_COOKIE = "tf_app";

/**
 * ¿Es el APK? Sirve cualquiera de las dos señales.
 *
 * Se miran las dos y no solo la cookie porque la cookie aparece recién
 * después del primer dibujo: la marca del identificador cubre ese primer
 * pedido, que es el que decide si la raíz muestra la portada o la app.
 */
export function isAppRequest(
  userAgent: string | null | undefined,
  cookie: string | null | undefined
): boolean {
  return isAppUserAgent(userAgent) || cookie === "1";
}
