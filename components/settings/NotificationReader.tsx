"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { ArrowClockwise, Copy, Gear, Trash } from "@phosphor-icons/react";
import { useToast } from "@/components/Toast";
import { Button } from "@/components/ui/Button";
import { Switch } from "@/components/ui/Switch";
import {
  abrirAjustesDeNotificaciones,
  appsQueNotificaron,
  borrarCapturadas,
  capturarApp,
  lectorDisponible,
  notificacionesCapturadas,
  ordenarApps,
  permisoConcedido,
  reconectarLector,
  volcadoDeTexto,
  type AppVista,
  type NotificacionCapturada,
} from "@/lib/notificaciones";
import { SettingsRow } from "./SettingsSection";

/**
 * El tablero del lector de notificaciones.
 *
 * ### Por qué esto es una pantalla y no una función automática todavía
 *
 * Lo que se quiere es que un aviso de compra se convierta en movimiento
 * solo. Esto es el paso anterior: juntar avisos de verdad para escribir los
 * parsers contra ellos. El motivo está contado en `lib/notificaciones.ts`,
 * y es corto: un parser escrito contra un formato imaginado fue
 * exactamente el bug que registró compras del Banco Popular como del BAC.
 *
 * ### La forma: elegir de quién, y después leer lo que llegó
 *
 * Primero el permiso, que en Android se da a mano. Después la lista de apps
 * que notificaron —que aparece sola, así no hay que saber el nombre del
 * paquete de ningún banco— para marcar de cuáles guardar el contenido. Y al
 * final lo capturado, con un botón para copiarlo todo.
 *
 * Nada de esto sale del teléfono por su cuenta: el botón de copiar pone el
 * texto en el portapapeles y la persona decide a dónde mandarlo.
 */
export function NotificationReader() {
  const toast = useToast();
  /**
   * Si el lector existe acá. Arranca en null y no en el valor de verdad:
   * leer el puente nativo durante el primer dibujo da una cosa en el
   * servidor y otra en el navegador, que es un error de hidratación. Se
   * resuelve en `refrescar`, después del primer dibujo.
   */
  const [disponible, setDisponible] = useState<boolean | null>(null);
  const [permiso, setPermiso] = useState<boolean | null>(null);
  const [apps, setApps] = useState<AppVista[]>([]);
  const [items, setItems] = useState<NotificacionCapturada[]>([]);
  const [pendiente, startTransition] = useTransition();

  const refrescar = useCallback(async () => {
    const hay = lectorDisponible();
    const [concedido, lista, capturadas] = await Promise.all([
      permisoConcedido(),
      appsQueNotificaron(),
      notificacionesCapturadas(),
    ]);
    setDisponible(hay);
    setPermiso(concedido);
    setApps(ordenarApps(lista));
    // Lo más nuevo arriba: es lo que uno acaba de provocar a propósito
    // haciendo una compra de prueba.
    setItems([...capturadas].reverse());
  }, []);

  useEffect(() => {
    // El lint sigue la llamada hacia adentro y cree que el estado cambia
    // durante el efecto. No es así: lo primero que hace `refrescar` es
    // esperar al plugin nativo, así que el `setState` ocurre en otro tick.
    // Es el mismo falso positivo que ya estaba documentado en el arranque
    // del cerrojo.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refrescar();
  }, [refrescar]);

  /**
   * Al volver de los ajustes de Android hay que mirar de nuevo.
   *
   * El permiso se concede **fuera de la app**, así que cuando la persona
   * vuelve, la pantalla sigue diciendo que no lo tiene. Es el caso que hace
   * pensar que el permiso no sirvió.
   */
  useEffect(() => {
    function alVolver() {
      if (document.visibilityState === "visible") void refrescar();
    }
    document.addEventListener("visibilitychange", alVolver);
    return () => document.removeEventListener("visibilitychange", alVolver);
  }, [refrescar]);

  function alternar(app: AppVista, activo: boolean) {
    // Optimista: el interruptor tiene que moverse al tocarlo, que si no se
    // siente trabado mientras el diálogo de Android está en pantalla.
    setApps((previas) =>
      previas.map((a) => (a.pkg === app.pkg ? { ...a, capturando: activo } : a))
    );
    startTransition(async () => {
      // **Prender pasa por un diálogo del sistema y se puede cancelar.**
      // Lo que vale es lo que contesta el plugin, no lo que se tocó: con
      // el optimista a secas, cancelar dejaba el interruptor prendido
      // diciendo que se está guardando algo que no se guarda.
      const quedo = await capturarApp(app.pkg, activo);
      if (quedo !== activo) {
        setApps((previas) =>
          previas.map((a) => (a.pkg === app.pkg ? { ...a, capturando: quedo } : a))
        );
      }
      await refrescar();
    });
  }

  async function copiar() {
    const texto = volcadoDeTexto(items);
    try {
      await navigator.clipboard.writeText(texto);
      toast.success("Copiado. Ya se puede pegar donde sea.");
    } catch {
      // Un WebView puede negar el portapapeles sin gesto directo. Que el
      // texto no se pueda copiar no puede dejarlo inalcanzable.
      toast.error("No se pudo copiar. El texto está abajo para seleccionarlo a mano.");
    }
  }

  /**
   * Fuera del APK no hay nada que ofrecer, y es importante no ofrecerlo.
   *
   * El botón de "Abrir ajustes" sin el puente nativo **no hace nada**: no
   * falla, no avisa, no pasa. Un botón así es peor que no tener botón,
   * porque deja pensando que la app está rota.
   *
   * La sección ya se esconde en la web desde `SettingsScreen`, pero esa
   * comprobación vive en otro archivo y mirando otra señal — y es
   * exactamente el tipo de cosa que falla por un lado y no por el otro
   * (pasó con la entrada de Google). Que el componente se defienda solo
   * cuesta tres líneas.
   */
  if (disponible === false) {
    return (
      <SettingsRow inline label="Leer notificaciones">
        <span className="text-meta text-ink-3">Solo en la app de Android</span>
      </SettingsRow>
    );
  }

  return (
    <>
      <SettingsRow
        inline
        label="Permiso de Android"
        description={
          // El valor, no una explicación de cómo funciona Android: el botón
          // de al lado ya lleva a donde se concede.
          permiso === null ? "Consultando…" : permiso ? "Concedido" : "Sin conceder"
        }
      >
        {permiso ? (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => startTransition(async () => {
              await reconectarLector();
              await refrescar();
              toast.success("Lector reiniciado.");
            })}
            disabled={pendiente}
          >
            <ArrowClockwise size={14} />
            Reiniciar
          </Button>
        ) : (
          <Button variant="primary" size="sm" onClick={() => void abrirAjustesDeNotificaciones()}>
            <Gear size={14} />
            Abrir ajustes
          </Button>
        )}
      </SettingsRow>

      <SettingsRow
        alignTop
        label="De cuáles guardar"
      >
        {apps.length === 0 ? (
          <p className="py-1 text-meta text-ink-3">
            {permiso
              ? "Todavía no notificó ninguna app. Volvé en un rato."
              : "Hace falta el permiso de arriba."}
          </p>
        ) : (
          <ul className="flex flex-col gap-1">
            {apps.map((app) => (
              <li key={app.pkg} className="flex items-center justify-between gap-3 py-1">
                <span className="flex min-w-0 flex-col">
                  <span className="truncate text-label text-ink">{app.nombre}</span>
                  <span className="truncate text-micro text-ink-3">
                    {app.pkg} · {app.vistas} {app.vistas === 1 ? "aviso" : "avisos"}
                  </span>
                </span>
                <Switch
                  checked={app.capturando}
                  onChange={() => alternar(app, !app.capturando)}
                  disabled={pendiente}
                  label={`Guardar los avisos de ${app.nombre}`}
                />
              </li>
            ))}
          </ul>
        )}
      </SettingsRow>

      <SettingsRow
        alignTop
        label="Lo capturado"
        description={
          items.length === 0
            ? undefined
            : `${items.length} ${items.length === 1 ? "aviso" : "avisos"}`
        }
      >
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" onClick={() => void copiar()}>
              <Copy size={14} />
              Copiar todo
            </Button>
            <Button
              variant="danger-ghost"
              size="sm"
              disabled={items.length === 0 || pendiente}
              onClick={() =>
                startTransition(async () => {
                  await borrarCapturadas();
                  await refrescar();
                })
              }
            >
              <Trash size={14} />
              Borrar
            </Button>
          </div>

          {items.length === 0 ? (
            <p className="text-meta text-ink-3">Nada todavía.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {items.map((item, i) => (
                <li
                  key={`${item.cuando}-${i}`}
                  className="rounded-control border border-line bg-surface-raised p-2.5"
                >
                  <p className="text-micro text-ink-3">
                    {item.app} ·{" "}
                    {new Intl.DateTimeFormat("es-CR", {
                      timeZone: "America/Costa_Rica",
                      dateStyle: "short",
                      timeStyle: "short",
                    }).format(new Date(item.cuando))}
                  </p>
                  {item.titulo && <p className="text-label text-ink">{item.titulo}</p>}
                  {/* `whitespace-pre-wrap`: un aviso de banco trae saltos de
                      línea adentro y son parte del formato que hay que ver. */}
                  <p className="whitespace-pre-wrap break-words text-meta text-ink-2">
                    {item.texto}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </SettingsRow>
    </>
  );
}
