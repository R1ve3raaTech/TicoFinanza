import { DownloadSimple } from "@phosphor-icons/react/dist/ssr";
import { AnchorLink } from "./AnchorLink";

/**
 * "Instalar en Android" en el hero.
 *
 * **Baja a la sección de instalación, no descarga.** Antes abría el aviso
 * de instalación del propio navegador y, si no había, llevaba a
 * `/descargar`. Ahora la única vía es el APK, y un botón del hero que
 * dispara la descarga de un archivo grande sin avisar es una emboscada:
 * la sección de abajo dice el tamaño y los tres pasos antes de que empiece.
 *
 * Dejó de ser un componente de cliente con eso: ya no consulta el estado
 * del navegador, así que no hay nada que hidratar ni ningún texto que
 * pueda cambiar después del primer dibujo.
 *
 * Va en secundario y no en primario: la acción principal de la portada es
 * entrar, y en esta app hay una sola acción primaria por pantalla.
 */
const CLASS =
  "inline-flex h-12 shrink-0 items-center gap-2.5 whitespace-nowrap rounded-control border border-line-strong px-6 text-base font-medium text-ink transition-colors duration-150 hover:border-ink hover:bg-surface";

export function InstallCta() {
  return (
    <AnchorLink href="#instalar" className={CLASS}>
      <DownloadSimple size={19} aria-hidden />
      Instalar en Android
    </AnchorLink>
  );
}
