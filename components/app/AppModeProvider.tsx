"use client";

import { createContext, useContext, type ReactNode } from "react";

/**
 * Si lo que se está viendo es el APK de Android o la web.
 *
 * El valor lo decide **el servidor** (lee el identificador del navegador,
 * ver lib/appMode.ts) y baja por contexto. No se lee `navigator.userAgent`
 * en el cliente a propósito: el servidor dibujaría una cosa y el navegador
 * otra, y eso es un error de hidratación — el mismo problema que ya costó
 * bugs con `useReducedMotion` y con la hora de Costa Rica.
 */
const AppModeContext = createContext(false);

export function AppModeProvider({ isApp, children }: { isApp: boolean; children: ReactNode }) {
  return <AppModeContext.Provider value={isApp}>{children}</AppModeContext.Provider>;
}

/** Fuera del provider devuelve `false`: la web es el caso por defecto. */
export function useIsApp(): boolean {
  return useContext(AppModeContext);
}
