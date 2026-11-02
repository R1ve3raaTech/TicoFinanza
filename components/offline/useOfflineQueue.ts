"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { addTransaction, type MovementInput } from "@/app/dashboard/actions";
import {
  isFrameworkNavigation,
  isNetworkFailure,
  localId,
  MAX_ATTEMPTS,
  ownedBy,
  sendable,
  type PendingMovement,
} from "@/lib/offline";
import {
  claimPending,
  deletePending,
  isSupported,
  listPending,
  putPending,
  releasePending,
} from "@/lib/offlineDb";
import { useQueueOwner } from "./QueueOwner";

/** Avisa a todas las partes de la app que miran la cola. */
const CHANGED = "ticofinanza:cola-cambio";

function announce() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(CHANGED));
}

/**
 * Guarda un movimiento para mandarlo cuando vuelva la señal.
 *
 * Pide el dueño: sin él, en una compu compartida el gasto de una persona
 * terminaría en la cuenta de la siguiente que entre.
 */
export async function queueMovement(userId: string, input: MovementInput): Promise<void> {
  await putPending({
    id: localId(),
    userId,
    input,
    queuedAt: Date.now(),
    status: "pending",
    attempts: 0,
  });
  announce();
}

/**
 * La cola de movimientos sin enviar, con su vaciado.
 *
 * Se vacía al abrir la app y cuando vuelve la señal, no desde el Service
 * Worker. La API de Background Sync mandaría con la app cerrada, pero un
 * Service Worker no puede llamar una Server Action, y abrir un segundo
 * camino de escritura por API pide una clave de deduplicación en la base
 * (otra migración) para que un reintento con la respuesta perdida no
 * anote el gasto dos veces. Para una app de plata, un movimiento duplicado
 * cuesta más que un envío que llega unos minutos después.
 */
export function useOfflineQueue() {
  const router = useRouter();
  const owner = useQueueOwner();
  const [items, setItems] = useState<PendingMovement[]>([]);
  const [flushing, setFlushing] = useState(false);
  const [ready, setReady] = useState(false);

  const refresh = useCallback(async () => {
    if (!isSupported()) {
      setReady(true);
      return [];
    }
    try {
      const rows = ownedBy(await listPending(), owner);
      setItems(rows);
      setReady(true);
      return rows;
    } catch {
      // En modo privado IndexedDB puede negarse. La app sigue andando: lo
      // único que se pierde es poder anotar sin señal.
      setReady(true);
      return [];
    }
  }, [owner]);

  const flush = useCallback(async () => {
    if (!isSupported() || !owner) return;
    setFlushing(true);
    let sent = 0;
    try {
      // Solo los de esta sesión: mandar los de otra persona los metería
      // en la cuenta equivocada, porque la acción escribe siempre con el
      // usuario que tiene la sesión abierta.
      const queue = sendable(ownedBy(await listPending(), owner));
      for (const item of queue) {
        // Si otra pestaña o un vaciado anterior ya lo tomó, se salta.
        if (!(await claimPending(item.id))) continue;
        try {
          const result = await addTransaction(item.input);
          if (result?.error) {
            // El servidor lo rechazó: reintentarlo no lo va a arreglar, se
            // quema el tope de una vez para que salga a la vista.
            await releasePending(item.id, {
              status: "failed",
              attempts: MAX_ATTEMPTS,
              lastError: result.error,
            });
            continue;
          }
          await deletePending(item.id);
          sent += 1;
        } catch (error) {
          if (isFrameworkNavigation(error)) {
            // La sesión venció y el servidor está mandando a /entrar: el
            // movimiento no tiene nada malo. Vuelve a la cola intacto y se
            // corta el vaciado; se reintenta cuando haya sesión.
            await releasePending(item.id, { status: "pending", attempts: item.attempts });
            break;
          }
          const attempts = item.attempts + 1;
          await releasePending(item.id, {
            status: isNetworkFailure(error) ? "pending" : "failed",
            attempts: isNetworkFailure(error) ? attempts : MAX_ATTEMPTS,
            lastError: isNetworkFailure(error)
              ? undefined
              : error instanceof Error
                ? error.message
                : "No se pudo enviar.",
          });
          // Sin señal no tiene sentido seguir con el resto de la cola.
          if (isNetworkFailure(error)) break;
        }
      }
    } finally {
      await refresh();
      setFlushing(false);
      announce();
      if (sent > 0) router.refresh();
    }
  }, [owner, refresh, router]);

  useEffect(() => {
    let alive = true;

    // La carga inicial va dentro de una promesa y no en el cuerpo del
    // efecto: leer IndexedDB es suscribirse a un sistema de afuera, y el
    // estado se actualiza en la respuesta, no de forma síncrona al montar.
    void (async () => {
      const all = await listPending().catch(() => [] as PendingMovement[]);
      const rows = ownedBy(all, owner);
      if (!alive) return;
      setItems(rows);
      setReady(true);
      if (rows.length > 0 && navigator.onLine) void flush();
    })();

    const onOnline = () => void flush();
    const onChanged = () => void refresh();
    window.addEventListener("online", onOnline);
    window.addEventListener(CHANGED, onChanged);
    return () => {
      alive = false;
      window.removeEventListener("online", onOnline);
      window.removeEventListener(CHANGED, onChanged);
    };
  }, [flush, owner, refresh]);

  const discard = useCallback(
    async (id: string) => {
      await deletePending(id);
      await refresh();
      announce();
    },
    [refresh]
  );

  const retry = useCallback(
    async (id: string) => {
      await releasePending(id, { status: "pending", attempts: 0, lastError: undefined });
      await flush();
    },
    [flush]
  );

  return { items, ready, flushing, flush, discard, retry };
}
