"use client";

import { useEffect } from "react";
import { endSession } from "@/lib/pageCache";

/**
 * Si estás viendo la pantalla de entrada, no hay sesión.
 *
 * Es la red de seguridad de todas las formas en que una sesión puede
 * terminar sin pasar por un botón: la cookie que vence sola, el servidor
 * que la invalida, una pestaña vieja. En cualquiera de esos casos se
 * llega acá, y acá se borra lo guardado.
 */
export function EndSessionOnEntry() {
  useEffect(() => {
    void endSession();
  }, []);

  return null;
}
