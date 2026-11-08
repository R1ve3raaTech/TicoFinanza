import { redirect } from "next/navigation";

/**
 * Ajustes dejó de ser una pantalla: ahora es un diálogo que se abre desde
 * la navegación (components/settings/SettingsEntry.tsx).
 *
 * La ruta se queda como redirección y no se borra del todo a propósito. Hay
 * tres formas de llegar acá con un enlace viejo: un marcador del navegador,
 * la app instalada con la pantalla guardada en el caché sin conexión, y el
 * enlace de "volver" del reporte en una pestaña abierta de antes. Las tres
 * darían 404 si la ruta desapareciera.
 */
export default function SettingsRedirect() {
  redirect("/dashboard");
}
