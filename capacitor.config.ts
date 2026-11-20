import type { CapacitorConfig } from "@capacitor/cli";

/**
 * El envoltorio de Android.
 *
 * **Carga el sitio en vivo** (`server.url`), no una copia empacada: por eso
 * un cambio en la web sale en el Android sin recompilar nada, que es lo que
 * pidió Camil. La contra es la que ya sabíamos: sin señal y con la app
 * cerrada, no hay de dónde cargar (el caché del Service Worker ayuda una
 * vez que se abrió al menos una vez; ver la nota del 2026-11-02).
 *
 * **`appendUserAgent` es la pieza que hace que la web sepa que es el APK.**
 * Tiene que coincidir con `APP_UA_MARKER` en `lib/appMode.ts`. Si se cambia
 * de un lado y no del otro, el APK pasa a comportarse como la web:
 * mostraría la portada, perdería el cerrojo y volvería el cierre de sesión
 * por inactividad. Lo comprueba `lib/appMode.test.ts` leyendo este archivo.
 *
 * **`appId` es nuevo a propósito.** El TWA viejo era
 * `com.ticofinanza.www.app`, firmado con otra llave: reusar ese id haría
 * que Android se negara a instalar encima ("app no instalada") por la firma
 * distinta. Con un id propio, el APK nuevo entra limpio y el viejo se
 * desinstala aparte.
 */
const config: CapacitorConfig = {
  appId: "com.ticofinanza.app",
  appName: "TicoFinanza",
  // Carpeta propia y mínima. **No apunta a `public/`** a propósito: el
  // contenido viene de `server.url`, así que empacar `public/` metía 1,2 MB
  // de capturas —y hasta el APK viejo *dentro* del APK nuevo— sin que nada
  // de eso se llegue a usar. Acá adentro solo vive la pantalla de "no se
  // pudo conectar".
  webDir: "capacitor-web",
  appendUserAgent: "TicoFinanzaApp/1",
  server: {
    url: "https://www.ticofinanza.com",
    // Sin texto plano: la app solo habla con su dominio, por HTTPS.
    cleartext: false,
  },
  android: {
    // La app no necesita leer ni escribir archivos del teléfono.
    allowMixedContent: false,
  },
};

export default config;
