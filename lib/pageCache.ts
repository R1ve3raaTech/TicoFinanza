/**
 * Borrar las pantallas guardadas para ver sin señal.
 *
 * El HTML guardado trae los montos de quien estaba usando la app. En una
 * compu compartida, quien entre después podría verlos con solo navegar sin
 * conexión. Por eso se borra al cerrar sesión a propósito.
 *
 * El cierre por inactividad NO llama a esto: ahí vuelve la misma persona, y
 * perder el modo sin conexión cada quince minutos lo volvería inútil.
 */
export async function clearPageCache(): Promise<void> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
  try {
    const registration = await navigator.serviceWorker.getRegistration();
    // `active` y no `controller`: al cerrar sesión la página puede estar
    // sin controlador (primera carga tras instalar el worker) y el mensaje
    // se perdería en silencio.
    registration?.active?.postMessage({ type: "tf-clear-pages" });
  } catch {
    // Que no se pueda limpiar no debe impedir cerrar sesión.
  }
}
