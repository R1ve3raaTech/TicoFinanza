import type { PendingMovement, PendingStatus } from "./offline";

/**
 * IndexedDB a mano, sin librería.
 *
 * Son cinco operaciones sobre un solo almacén; `idb` y compañía pesan más
 * que esto y lo único que agregan es envolver los eventos en promesas, que
 * es justo lo que hace `request()` acá abajo.
 *
 * Se eligió IndexedDB y no localStorage porque localStorage es síncrono
 * (bloquea el hilo de la interfaz justo cuando se está guardando algo) y
 * guarda solo texto: cada lectura sería un JSON.parse de toda la cola.
 */

const DB_NAME = "ticofinanza-offline";
const DB_VERSION = 1;
const STORE = "pending-movements";

export function isSupported(): boolean {
  return typeof indexedDB !== "undefined";
}

let dbPromise: Promise<IDBDatabase> | null = null;

function open(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) {
        req.result.createObjectStore(STORE, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
    // En modo privado de algunos navegadores la base queda bloqueada en vez
    // de fallar: se rechaza para que quien llama muestre el error en vez de
    // quedarse esperando sin decir nada.
    req.onblocked = () => reject(new Error("La base local está bloqueada por otra pestaña."));
  });
  return dbPromise;
}

/**
 * Una transacción con un solo pedido, resuelta cuando la transacción
 * termina de verdad.
 *
 * Los manejadores se enganchan de corrido, sin `await` en el medio: una
 * transacción de IndexedDB se cierra sola apenas se vacía la cola de
 * microtareas, así que un `tx.oncomplete` colgado después de esperar el
 * pedido llega tarde y la promesa no resuelve nunca. Es el error que dejó
 * la cola de pendientes invisible la primera vez.
 */
function withStore<T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
  return open().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(STORE, mode);
        const req = run(tx.objectStore(STORE));
        let result: T;
        req.onsuccess = () => {
          result = req.result;
        };
        req.onerror = () => reject(req.error);
        tx.oncomplete = () => resolve(result);
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error);
      })
  );
}

export async function listPending(): Promise<PendingMovement[]> {
  if (!isSupported()) return [];
  return withStore<PendingMovement[]>("readonly", (store) => store.getAll());
}

export async function putPending(item: PendingMovement): Promise<void> {
  await withStore("readwrite", (store) => store.put(item));
}

export async function deletePending(id: string): Promise<void> {
  await withStore("readwrite", (store) => store.delete(id));
}

/**
 * Marca un pendiente como "en camino" dentro de una sola transacción.
 *
 * Devuelve false si alguien ya lo había marcado: leer y después escribir en
 * dos pasos deja una ventana en la que dos vaciados de la cola (el de abrir
 * la app y el de recuperar la señal, por ejemplo) mandan el mismo
 * movimiento y queda anotado dos veces.
 */
export async function claimPending(id: string): Promise<boolean> {
  if (!isSupported()) return false;
  const db = await open();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    const store = tx.objectStore(STORE);
    let claimed = false;
    const get = store.get(id);
    get.onsuccess = () => {
      const item = get.result as PendingMovement | undefined;
      if (!item || item.status === "sending") return;
      claimed = true;
      store.put({ ...item, status: "sending" satisfies PendingStatus });
    };
    get.onerror = () => reject(get.error);
    // Se resuelve cuando la marca ya está escrita, no apenas se decidió:
    // si no, un segundo vaciado podría leer la fila todavía sin marcar y
    // mandar el mismo movimiento dos veces.
    tx.oncomplete = () => resolve(claimed);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

/** Devuelve un pendiente a la cola después de un intento fallido. */
export async function releasePending(
  id: string,
  update: { status: PendingStatus; attempts: number; lastError?: string }
): Promise<void> {
  const db = await open();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    const store = tx.objectStore(STORE);
    const get = store.get(id);
    get.onsuccess = () => {
      const item = get.result as PendingMovement | undefined;
      if (!item) {
        resolve();
        return;
      }
      store.put({ ...item, ...update });
    };
    get.onerror = () => reject(get.error);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}
