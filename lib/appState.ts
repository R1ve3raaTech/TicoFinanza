/**
 * Avisar cuándo la app se fue al fondo y cuándo volvió, **dentro del APK**.
 *
 * ### Por qué esto hizo falta
 *
 * El cerrojo tenía tres detectores web —`visibilitychange`, `focus`,
 * `pageshow`— y un cuarto que miraba el reloj buscando el hueco que deja
 * una app congelada. Ninguno disparaba nunca, y la razón resultó ser que
 * **Capacitor no pausa el WebView**: leyendo su `Bridge.onPause()`, lo
 * único que hace es avisarles a los plugins. La página sigue viva,
 * corriendo sus temporizadores en segundo plano.
 *
 * O sea que la premisa de los cuatro era falsa: la app nunca se congela,
 * así que no hay hueco que medir, y nunca se la declara oculta, así que no
 * hay evento que llegue. Se esperaba una señal que el sistema no manda.
 *
 * La que sí existe es la del ciclo de vida de la Activity, que es lo que
 * `@capacitor/app` expone. **Es un dato nativo**: no depende de que el
 * navegador se dé cuenta de nada.
 *
 * ### Por qué la carga es perezosa
 *
 * `@capacitor/app` habla con el lado nativo. En la web no hay con quién
 * hablar, y importarlo arriba lo metería en el paquete de todas las
 * páginas para no usarlo nunca. Acá el `import()` tardío **no tiene el
 * problema que tuvo con la huella** —donde esperar una descarga dejaba a
 * la persona trabada afuera— porque esto no abre nada: si tarda o no
 * llega, lo único que pasa es que el cerrojo no se entera de una vuelta, y
 * el cerrojo ya está puesto.
 */

import { hasNativeBridge } from "./nativeBridge";

/** Deja de escuchar. */
export type Desuscribir = () => void;

/**
 * Llama a `alVolver` cada vez que la app vuelve al frente, con cuántos
 * milisegundos estuvo afuera.
 *
 * Fuera del APK no hace nada y lo dice devolviendo `null`: así quien lo
 * usa sabe que tiene que seguir mirando los eventos del navegador, que en
 * la web sí funcionan.
 */
export function onAppResume(alVolver: (afueraMs: number) => void): Desuscribir | null {
  if (!hasNativeBridge()) return null;

  let seFue: number | null = null;
  let vivo = true;
  let quitar: Desuscribir | null = null;

  void (async () => {
    try {
      const { App } = await import("@capacitor/app");
      const handle = await App.addListener("appStateChange", ({ isActive }) => {
        if (!isActive) {
          seFue = Date.now();
          return;
        }
        // Sin marca de salida no se inventa un tiempo afuera: el primer
        // aviso después de abrir la app es "está activa", y tomarlo por
        // una vuelta cerraría el cerrojo apenas se desbloquea.
        if (seFue === null) return;
        const afuera = Date.now() - seFue;
        seFue = null;
        alVolver(afuera);
      });
      // Si el efecto se limpió mientras se cargaba el plugin, el oyente
      // llega tarde y hay que soltarlo de una, o queda colgado.
      if (!vivo) void handle.remove();
      else quitar = () => void handle.remove();
    } catch {
      // Un plugin que no carga no puede tumbar la pantalla. El cerrojo
      // sigue cerrado, que es el lado seguro.
    }
  })();

  return () => {
    vivo = false;
    quitar?.();
  };
}
