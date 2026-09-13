// Archivo común (no "use client") para que la vista del servidor y el índice
// del cliente lean la misma lista: una constante exportada desde un módulo de
// cliente le llega al servidor como referencia, no como valor.
export const SETTINGS_SECTIONS = [
  { id: "perfil", label: "Perfil" },
  { id: "gmail", label: "Gmail" },
  { id: "categorias", label: "Categorías" },
  { id: "presupuestos", label: "Presupuestos" },
  { id: "notificaciones", label: "Notificaciones" },
  { id: "apariencia", label: "Apariencia" },
  { id: "datos", label: "Datos" },
  { id: "sesion", label: "Sesión" },
  { id: "peligro", label: "Zona de peligro" },
] as const;

export type SettingsSectionId = (typeof SETTINGS_SECTIONS)[number]["id"];
