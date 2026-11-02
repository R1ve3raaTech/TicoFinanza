"use client";

import { createContext, useContext, useEffect, type ReactNode } from "react";
import { markSessionActive } from "@/lib/pageCache";

/**
 * De quién es la cola de movimientos sin enviar.
 *
 * IndexedDB es del origen, no de la sesión: en una compu compartida sigue
 * ahí después de cerrar sesión. Sin dueño, lo que una persona anotó sin
 * señal se le mostraría a la siguiente que entre y se mandaría a SU
 * cuenta. Por eso cada pendiente guarda el id de quien lo anotó y la app
 * solo lista y manda los suyos.
 *
 * Lo que queda de otra persona no se borra: es un gasto que todavía no se
 * registró, y borrarlo sería perderlo. Queda invisible hasta que esa
 * persona vuelva a entrar en este mismo navegador.
 */
const OwnerContext = createContext<string | null>(null);

export function QueueOwnerProvider({
  userId,
  children,
}: {
  userId: string;
  children: ReactNode;
}) {
  // Mientras esta pantalla esté viva hay sesión de esta persona. El
  // Service Worker lee esta marca para decidir si puede servir pantallas
  // guardadas, y de quién (ver lib/pageCache.ts).
  useEffect(() => {
    void markSessionActive(userId);
  }, [userId]);

  return <OwnerContext.Provider value={userId}>{children}</OwnerContext.Provider>;
}

/** El id de la sesión actual, o null fuera del área con sesión. */
export function useQueueOwner(): string | null {
  return useContext(OwnerContext);
}
