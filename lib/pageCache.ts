/**
 * Quién puede ver las pantallas guardadas para usar sin señal.
 *
 * El HTML guardado trae los montos de quien estaba usando la app. El
 * servidor lo manda con `Cache-Control: private, no-store` — la Cache
 * Storage API no respeta esa cabecera, así que guardar ahí es pasarle por
 * encima a propósito. Eso solo es aceptable si lo guardado deja de estar
 * disponible en el momento en que la sesión termina.
 *
 * De eso se ocupa la marca de sesión: mientras hay sesión abierta guarda
 * el id de la persona, y el Service Worker solo sirve pantallas del caché
 * que le corresponde. Sin marca no sirve ninguna.
 */

const DB_NAME = "ticofinanza-sesion";
const STORE = "marca";
const KEY = "duenio-activo";

/** Prefijo de los cachés de pantallas. Tiene que coincidir con sw.js. */
const PAGES_PREFIX = "tf-pages-";

/**
 * Cuánto vale la marca sin refrescarse. Tiene que coincidir con sw.js.
 *
 * La marca dice "hubo sesión viva en este navegador hace poco", no "hay
 * sesión ahora": quien cierra el navegador sin salir no pasa por ningún
 * borrado. Sin vencimiento, esa marca quedaría viva para siempre y
 * autorizaría a leer el caché mucho después de que la sesión murió.
 *
 * Doce horas es el compromiso: cubre el caso real de abrir la app en la
 * casa y leerla sin señal más tarde en el bus, y acota la ventana en la
 * que alguien más, con el dispositivo en la mano y sin red, podría leer
 * pantallas de una sesión que ya no existe. El vencimiento de lo guardado
 * (siete días, en sw.js) queda como tope de afuera.
 */
const MARK_MAX_AGE_MS = 12 * 60 * 60 * 1000;

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

interface SessionMark {
  userId: string;
  /** Cuándo se refrescó por última vez, en milisegundos. */
  at: number;
}

/**
 * Cuánto puede tardar una pantalla recién hecha en llegar e hidratarse.
 *
 * Generosa a propósito: una conexión lenta no debería contar como "esto
 * salió del caché". Una pantalla guardada tiene minutos u horas, así que
 * dos minutos separa los dos casos de sobra.
 */
const FRESH_RENDER_MS = 2 * 60 * 1000;

/**
 * ¿Esta pantalla la acaba de hacer el servidor, o salió del caché?
 *
 * De esto depende que la marca de sesión se pueda refrescar. Si se
 * refrescara desde una pantalla guardada, abrir la app sin señal
 * renovaría el permiso para seguir leyendo el caché, y el vencimiento de
 * doce horas no vencería nunca: el permiso se renovaría leyendo aquello
 * mismo que autoriza. La prueba de que hay sesión viva tiene que venir
 * del servidor, no del caché.
 *
 * Se compara en valor absoluto porque un reloj adelantado da diferencia
 * negativa, y eso tampoco es prueba de nada.
 */
export function isFreshRender(renderedAtMs: number, now = Date.now()): boolean {
  if (!Number.isFinite(renderedAtMs)) return false;
  return Math.abs(now - renderedAtMs) <= FRESH_RENDER_MS;
}

export function markIsFresh(mark: SessionMark | null, now = Date.now()): boolean {
  if (!mark || !mark.userId || typeof mark.userId !== "string") return false;
  if (!Number.isFinite(mark.at)) return false;
  const age = now - mark.at;
  // Una marca con fecha futura es un reloj desajustado, no una sesión
  // fresca: se descarta, igual que en lib/idle.ts.
  return age >= 0 && age <= MARK_MAX_AGE_MS;
}

function write(value: SessionMark | null): Promise<void> {
  return open().then(
    (db) =>
      new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE, "readwrite");
        const store = tx.objectStore(STORE);
        if (value === null) store.delete(KEY);
        else store.put(value, KEY);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error);
      })
  );
}

/** Hay sesión de esta persona: sus pantallas se pueden servir sin señal. */
export async function markSessionActive(userId: string, renderedAtMs: number): Promise<void> {
  if (typeof indexedDB === "undefined") return;
  // Solo desde una pantalla que acaba de hacer el servidor: ver
  // isFreshRender(). Una guardada no prueba que la sesión siga viva.
  if (!isFreshRender(renderedAtMs)) return;
  try {
    await write({ userId, at: Date.now() });
  } catch {
    // Sin la marca, el worker no sirve nada del caché. Falla cerrado.
  }
}

/**
 * Se acabó la sesión: borra la marca y las pantallas guardadas.
 *
 * El borrado va **directo desde la página** con `caches.delete`, que se
 * puede esperar y funciona aunque no haya un Service Worker activo. Antes
 * esto mandaba un mensaje al worker sin esperar respuesta: si el worker
 * no estaba activo todavía, el mensaje se perdía en silencio y las
 * pantallas quedaban guardadas creyendo que se habían borrado.
 */
export async function endSession(): Promise<void> {
  if (typeof indexedDB !== "undefined") {
    try {
      await write(null);
    } catch {
      // Sigue el borrado del caché aunque la marca no se pueda tocar.
    }
  }
  if (typeof caches === "undefined") return;
  try {
    const names = await caches.keys();
    await Promise.all(
      names.filter((name) => name.startsWith(PAGES_PREFIX)).map((name) => caches.delete(name))
    );
  } catch {
    // Que no se pueda limpiar no debe impedir cerrar sesión.
  }
}
