/**
 * El lector de notificaciones del teléfono, lado web.
 *
 * ### Qué es y qué todavía no es
 *
 * El objetivo es que un aviso de compra del banco o de Google Wallet se
 * convierta en un movimiento sin que nadie lo escriba. Esto es **la fase de
 * captura**: lo único que hace es juntar el texto crudo de esos avisos y
 * mostrarlo, para poder escribir los parsers contra avisos de verdad.
 *
 * No es un paso de más. Es la lección del bug de agosto: las notificaciones
 * de compra del Banco Popular usaban el mismo encabezado de tabla que las
 * del BAC, así que un parser escrito mirando solo las del BAC registraba
 * las del otro banco como si fueran suyas. Acá el costo sería peor, porque
 * el dato equivocado entra solo en las cuentas en vez de pedir confirmación.
 *
 * ### Dónde viven los datos
 *
 * En el teléfono, en las preferencias de la app, y en ningún otro lado. No
 * hay tabla nueva ni llamada al servidor: el texto de un aviso bancario trae
 * el comercio, el monto y a veces los últimos dígitos de la tarjeta, y
 * subirlo para después decidir si sirve es subir datos de cuenta antes de
 * saber si hacen falta. La razón entera está en
 * `android/app/src/main/java/com/ticofinanza/app/AlmacenDeNotificaciones.java`.
 *
 * ### Qué se captura de quién
 *
 * El servicio anota **el nombre** de toda app que notifica —nada de su
 * contenido— y eso llena la lista desde la que se eligen los bancos: es la
 * única forma de encontrar el paquete de una app sin adivinarlo. El
 * contenido se guarda solo de los paquetes marcados a mano.
 */

import { hasNativeBridge } from "./nativeBridge";

/** Una app que notificó alguna vez. */
export interface AppVista {
  pkg: string;
  nombre: string;
  /** Cuántos avisos mandó desde que el lector está activo. */
  vistas: number;
  /** Último aviso, en milisegundos. */
  ultima: number;
  /** Si su contenido se está guardando. */
  capturando: boolean;
}

/** Un aviso capturado, tal como llegó. */
export interface NotificacionCapturada {
  pkg: string;
  app: string;
  titulo: string;
  texto: string;
  cuando: number;
}

/** Lo que el plugin nativo expone. */
interface LectorNativo {
  permiso(): Promise<{ concedido: boolean }>;
  abrirAjustes(): Promise<void>;
  apps(): Promise<{ apps: AppVista[] }>;
  capturar(opciones: { pkg: string; activo: boolean }): Promise<{ activo: boolean }>;
  leer(): Promise<{ items: NotificacionCapturada[] }>;
  borrar(): Promise<void>;
  reconectar(): Promise<void>;
}

/**
 * El plugin, o null fuera del APK.
 *
 * Se carga con `import()` y no arriba del archivo para que el código de
 * Capacitor **no entre en el bundle de la web**, que nunca lo va a usar.
 */
let cacheDelPlugin: Promise<LectorNativo | null> | null = null;

async function lector(): Promise<LectorNativo | null> {
  if (!hasNativeBridge()) return null;
  // **Una sola vez.** `registerPlugin` avisa "already registered. Cannot
  // register plugins twice" si se llama de nuevo, y este archivo lo
  // llamaba desde cada función exportada: siete avisos por cada refresco
  // del tablero, que es justo el ruido que esconde un aviso de verdad.
  cacheDelPlugin ??= (async () => {
    try {
      const { registerPlugin } = await import("@capacitor/core");
      return registerPlugin<LectorNativo>("LectorNotificaciones");
    } catch {
      return null;
    }
  })();
  return cacheDelPlugin;
}

/**
 * Tope para cada llamada al lado nativo, en milisegundos.
 *
 * **Una llamada al lado nativo que no está no falla: se queda sin
 * contestar.** Y hay un caso en que eso va a pasar seguro: el código de la
 * web sale a producción en cuanto se publica, pero el APK instalado solo
 * cambia cuando alguien compila e instala uno nuevo. O sea que durante ese
 * rato esta pantalla corre contra una app **sin el plugin**, que es
 * exactamente el estado que cuelga.
 *
 * Es el mismo tropiezo que ya costó dos vueltas en este proyecto: el
 * cerrojo colgado en "Esperando tu huella..." y el cierre de sesión en
 * "Cerrando...". La regla que salió de ahí: **toda llamada al lado nativo
 * lleva tope**.
 */
const TOPE_MS = 2500;

/**
 * Resuelve el plugin, lo llama, y nunca deja esperando ni deja escapar
 * nada. Sin plugin o si algo falla, devuelve `siNo`.
 *
 * **El tope cubre también la resolución del plugin, no solo la llamada.**
 * La primera versión lo ponía alrededor del método nada más, y el tablero
 * se quedaba igual en "Consultando…": lo que colgaba era `registerPlugin`
 * contra un Capacitor que se cree en Android y no encuentra el plugin.
 * Comprobado en la QA, inyectando un puente nativo falso.
 *
 * **Recibe una función y no una promesa**, y eso no es estilo: Capacitor
 * puede **lanzar de forma sincrónica**. Con una promesa como parámetro, la
 * excepción ocurre al evaluar el argumento —antes de entrar acá— y se
 * escapa de los dos lados.
 */
async function llamar<T>(accion: (plugin: LectorNativo) => Promise<T>, siNo: T): Promise<T> {
  const trabajo = (async () => {
    const plugin = await lector();
    if (!plugin) return siNo;
    return await accion(plugin);
  })();

  try {
    return await Promise.race([
      trabajo.catch(() => siNo),
      new Promise<T>((resolve) => setTimeout(() => resolve(siNo), TOPE_MS)),
    ]);
  } catch {
    return siNo;
  }
}

/** ¿Se puede usar el lector acá? Solo dentro del APK. */
export function lectorDisponible(): boolean {
  return hasNativeBridge();
}

export async function permisoConcedido(): Promise<boolean> {
  const { concedido } = await llamar((p) => p.permiso(), { concedido: false });
  return Boolean(concedido);
}

export async function abrirAjustesDeNotificaciones(): Promise<void> {
  await llamar((p) => p.abrirAjustes(), undefined);
}

export async function appsQueNotificaron(): Promise<AppVista[]> {
  const { apps } = await llamar((p) => p.apps(), { apps: [] as AppVista[] });
  return Array.isArray(apps) ? apps : [];
}

/**
 * Marca o desmarca una app, y devuelve **cómo quedó**.
 *
 * No devuelve void porque prender pasa por un diálogo del sistema y la
 * persona puede cancelarlo: la pantalla mueve el interruptor al tocarlo
 * (si no, se siente trabado) y necesita saber si tiene que devolverlo.
 *
 * El diálogo existe porque el permiso de Android es de todo o nada — el
 * servicio ve los avisos de toda app del teléfono, y esta lista es lo
 * único que decide de cuáles se guarda el texto. La razón entera está en
 * `LectorPlugin.capturar`.
 *
 * **Sin tope**, al contrario que el resto: lo contesta una persona mirando
 * un diálogo y puede tardar lo que quiera. Si no hay plugin, `llamar`
 * devuelve el `siNo` de una.
 */
export async function capturarApp(pkg: string, activo: boolean): Promise<boolean> {
  const plugin = await llamar(async (p) => p, null as LectorNativo | null);
  if (!plugin) return false;
  try {
    const { activo: quedo } = await plugin.capturar({ pkg, activo });
    return Boolean(quedo);
  } catch {
    // Rechaza si el paquete nunca notificó o si no se pudo dibujar el
    // diálogo. En los dos casos no quedó prendido.
    return false;
  }
}

export async function notificacionesCapturadas(): Promise<NotificacionCapturada[]> {
  const { items } = await llamar((p) => p.leer(), {
    items: [] as NotificacionCapturada[],
  });
  return Array.isArray(items) ? items : [];
}

export async function borrarCapturadas(): Promise<void> {
  await llamar((p) => p.borrar(), undefined);
}

export async function reconectarLector(): Promise<void> {
  await llamar((p) => p.reconectar(), undefined);
}

/**
 * Las apps ordenadas para la lista: primero las que ya se están
 * capturando, después las que más notificaron.
 *
 * Las marcadas arriba porque son las que uno vuelve a mirar; el resto por
 * cantidad de avisos, que es lo que hace que una app de banco salte a la
 * vista entre veinte aplicaciones.
 */
export function ordenarApps(apps: AppVista[]): AppVista[] {
  return [...apps].sort((a, b) => {
    if (a.capturando !== b.capturando) return a.capturando ? -1 : 1;
    if (b.vistas !== a.vistas) return b.vistas - a.vistas;
    return a.nombre.localeCompare(b.nombre, "es");
  });
}

/**
 * El volcado de texto que se copia para mandar.
 *
 * Es texto plano a propósito: se pega en WhatsApp, en un correo o en un
 * chat sin que nada lo reformatee, y se lee sin abrirlo con nada. Cada
 * aviso va delimitado para que se vea dónde empieza y termina, que importa
 * porque un aviso bancario puede traer saltos de línea adentro.
 *
 * **La fecha se escribe en hora de Costa Rica**, como todo el calendario de
 * la app: el `cuando` que manda Android son milisegundos, y leerlos con el
 * huso del dispositivo daría una hora distinta en cada teléfono.
 */
export function volcadoDeTexto(items: NotificacionCapturada[]): string {
  if (items.length === 0) return "No hay notificaciones capturadas.";

  const fecha = new Intl.DateTimeFormat("es-CR", {
    timeZone: "America/Costa_Rica",
    dateStyle: "short",
    timeStyle: "short",
  });

  const bloques = items.map((item, i) => {
    const cuando = Number.isFinite(item.cuando) ? fecha.format(new Date(item.cuando)) : "sin fecha";
    return [
      `--- ${i + 1} ---`,
      `app: ${item.app} (${item.pkg})`,
      `cuando: ${cuando}`,
      `titulo: ${item.titulo}`,
      `texto: ${item.texto}`,
    ].join("\n");
  });

  // El plural de "notificación" pierde la tilde, así que las dos palabras
  // van escritas enteras y no armadas con un sufijo.
  const cuantas =
    items.length === 1 ? "1 notificación capturada" : `${items.length} notificaciones capturadas`;

  return `TicoFinanza · ${cuantas}\n\n${bloques.join("\n\n")}`;
}
