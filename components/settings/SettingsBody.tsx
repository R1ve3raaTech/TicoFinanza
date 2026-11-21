"use client";

import { useSettingsData } from "./SettingsEntry";
import { SettingsScreen } from "./SettingsScreen";

/**
 * El puente entre la página y la pantalla.
 *
 * Existe solo para tomar los datos del contexto: la página es del
 * servidor y el contexto es del cliente, así que alguien tiene que hacer
 * ese salto. Sin datos no dibuja nada —pasa en una vista de prueba sin el
 * provider— en vez de romper la pantalla entera.
 */
export function SettingsBody() {
  const data = useSettingsData();
  if (!data) return null;
  return <SettingsScreen data={data} />;
}
