// Archivo común (no "use client") para que la vista del servidor y el índice
// del cliente lean la misma lista: una constante exportada desde un módulo de
// cliente le llega al servidor como referencia, no como valor.
export const SETTINGS_SECTIONS = [
  { id: "guia", label: "Guía" },
  { id: "perfil", label: "Perfil" },
  { id: "categorias", label: "Categorías" },
  { id: "apariencia", label: "Apariencia" },
  { id: "recordatorios", label: "Recordatorios" },
  { id: "datos", label: "Datos" },
  { id: "sesion", label: "Sesión" },
  { id: "peligro", label: "Zona de peligro" },
] as const;

export type SettingsSectionId = (typeof SETTINGS_SECTIONS)[number]["id"];
