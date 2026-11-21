"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "@/app/dashboard/actions";
import { verifyAppPin } from "@/app/dashboard/ajustes/actions";
import { BrandMark } from "@/components/brand/BrandMark";
import { ForgotPinDialog } from "./ForgotPinDialog";
import { Button } from "@/components/ui/Button";
import {
  cleanPinInput,
  PIN_LENGTH,
  lockEnabled,
  shouldAskOnReturn,
  type AppLockWhen,
} from "@/lib/appLock";
import { onAppResume } from "@/lib/appState";
import { endSession } from "@/lib/pageCache";

/**
 * El cerrojo del APK: un PIN de seis dígitos.
 *
 * **Hubo huella y se quitó.** El lector funcionaba —el diagnóstico en el
 * teléfono de Camil contestaba "disponible: sí, decisión: pedir"— y aun
 * así el cerrojo no la pedía al entrar. Lo que fallaba era todo lo que la
 * rodea: un puente nativo que puede no estar listo cuando se pregunta, tres
 * detectores de "volví a la app" porque ninguno es fiable solo, y un camino
 * de "no se pudo preguntar" que, sin PIN, abría la app en silencio. Cinco
 * agujeros de seguridad salieron de esa misma rama.
 *
 * El PIN no tiene nada de eso: se dibuja y ya. No depende del puente, ni de
 * un diálogo del sistema, ni de que Android conteste a tiempo. **Lo que se
 * pierde en comodidad se gana en que de verdad se cierra.**
 *
 * **Esto es un cerrojo de pantalla, no cifrado.** Frena a quien agarra el
 * teléfono desbloqueado, que es el caso real por el que existe. Quien pueda
 * extraer el almacenamiento del dispositivo no pasa por acá.
 *
 * Reemplaza al cierre por inactividad **solo dentro del APK**: ahí la
 * sesión se queda viva (es tu teléfono, no una compu prestada) y lo que
 * protege es esto. En la web sigue el cierre a los 15 minutos.
 *
 * **Sin PIN puesto no se cierra nada.** Trabar a alguien afuera de sus
 * propios datos es peor que el riesgo que se evitaría, y sin PIN no habría
 * con qué volver a entrar. Y aun con PIN siempre está la salida de cerrar
 * sesión y el código por correo, porque un PIN olvidado no puede ser el
 * final del camino.
 */
export function AppLockGate({
  lockWhen,
  hasPin,
  children,
}: {
  lockWhen: AppLockWhen;
  hasPin: boolean;
  children: React.ReactNode;
}) {
  // **Sin PIN no hay cerrojo.** Antes la huella podía cerrar sola; ahora el
  // PIN es lo único que abre, así que cerrar sin tenerlo puesto sería
  // dejar a la persona afuera para siempre.
  const enabled = lockEnabled(lockWhen) && hasPin;
  const [locked, setLocked] = useState(enabled);

  // Cuándo se fue la app a segundo plano. Se compara contra el reloj y no
  // con un temporizador: si Android congela la app, un `setTimeout` se
  // congela con ella y al volver nunca vencería.
  const hiddenAt = useRef<number | null>(null);

  // Arranca en 0 y no en `Date.now()`: leer el reloj mientras se dibuja es
  // un efecto secundario durante el render, y el lint lo marca. Lo pone en
  // hora el latido, que corre en un efecto; hasta entonces, 0 quiere decir
  // "todavía no hay nada que medir".
  const ultimoLatido = useRef(0);

  // Espejo de `locked` para que el latido lo consulte sin tener que
  // reiniciarse en cada cambio de estado. Se escribe en un efecto y no
  // durante el render: tocar una ref mientras se dibuja es justo lo que
  // React pide no hacer.
  const lockedRef = useRef(locked);
  useEffect(() => {
    lockedRef.current = locked;
  }, [locked]);

  const volvio = useCallback(
    (afueraMs: number) => {
      if (!shouldAskOnReturn(lockWhen, afueraMs)) return;
      setLocked(true);
    },
    [lockWhen]
  );

  // **El aviso que de verdad llega dentro del APK**, y el único que
  // funciona: el ciclo de vida de la Activity.
  //
  // Los de abajo son los del navegador y acá no sirven, por un motivo que
  // costó dos vueltas encontrar: **Capacitor no pausa el WebView**. Su
  // `Bridge.onPause()` solo avisa a los plugins, así que la página sigue
  // viva en segundo plano — nunca se la declara oculta y sus
  // temporizadores nunca se congelan. Los cuatro detectores de abajo
  // esperaban una señal que el sistema no manda.
  //
  // En la web no hay plugin y `onAppResume` devuelve `null`; ahí los de
  // abajo sí funcionan y son los que quedan.
  useEffect(() => {
    if (!enabled) return;
    return onAppResume((afueraMs) => {
      // El latido se pone al día para que no vuelva a contar el mismo rato.
      ultimoLatido.current = Date.now();
      hiddenAt.current = null;
      volvio(afueraMs);
    }) ?? undefined;
  }, [enabled, volvio]);

  // Volver a la app después de un rato afuera, por el camino del navegador.
  //
  // **Hay tres avisos para el mismo momento, y ninguno sobra.**
  // `visibilitychange` es el camino de la web y adentro de un WebView de
  // Android **no es fiable**: cuando el sistema pausa la actividad, muchas
  // veces nunca llega. `focus` llega cuando Android devuelve el foco a la
  // ventana, que es el caso de volver desde la lista de recientes, y
  // `pageshow` cubre la vuelta desde el historial.
  useEffect(() => {
    if (!enabled) return;

    /**
     * Volvimos al frente: ¿cuánto estuvimos afuera?
     *
     * **Se mide contra el latido y no solo contra `hiddenAt`.** Ese dato
     * solo existe si el evento de "me fui" llegó, y adentro del WebView
     * muchas veces no llega. El latido, en cambio, se congela con la app:
     * el tiempo desde el último es el tiempo que estuvimos afuera, lo haya
     * anunciado alguien o no.
     */
    function volviAlFrente() {
      const ahora = Date.now();
      const desdeEvento = hiddenAt.current;
      hiddenAt.current = null;
      const afuera = Math.max(
        desdeEvento === null ? 0 : ahora - desdeEvento,
        ultimoLatido.current === 0 ? 0 : ahora - ultimoLatido.current
      );
      // El latido se pone al día acá mismo: si no, el intervalo volvería a
      // ver el mismo hueco en su primer tick.
      ultimoLatido.current = ahora;
      if (afuera <= 0) return;
      volvio(afuera);
    }

    function onVisibility() {
      if (document.visibilityState === "hidden") {
        hiddenAt.current = Date.now();
        return;
      }
      volviAlFrente();
    }

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("focus", volviAlFrente);
    window.addEventListener("pageshow", volviAlFrente);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("focus", volviAlFrente);
      window.removeEventListener("pageshow", volviAlFrente);
    };
  }, [enabled, volvio]);

  // El latido: el detector que no depende de ningún evento. Si entre dos
  // vueltas pasó mucho más que el intervalo, es que a la app la congelaron
  // — que es justo lo que pasa al mandarla al fondo.
  useEffect(() => {
    if (!enabled) return;

    ultimoLatido.current = Date.now();
    const id = setInterval(() => {
      const ahora = Date.now();
      const hueco = ahora - ultimoLatido.current;
      ultimoLatido.current = ahora;

      // Con el cerrojo ya en pantalla no hay nada que medir.
      if (lockedRef.current) return;

      if (hueco >= HUECO_MINIMO_MS) volvio(hueco);
    }, LATIDO_MS);

    return () => clearInterval(id);
  }, [enabled, volvio]);

  if (!locked) return <>{children}</>;

  return (
    <>
      {/* `hidden` es `display: none`, y eso importa: el primer intento usó
          `opacity-0` y el contenido seguía dibujado debajo del cerrojo —
          transparente, pero ahí, y la QA lo leyó del DOM. Si la capa de
          encima no llegara a pintarse, los montos quedarían a la vista.
          Con `display: none` no se dibuja ni sale en el árbol de
          accesibilidad, y aun así el árbol de React **se queda montado**,
          así que no se pierde lo que estuvieras escribiendo. */}
      <div aria-hidden inert hidden>
        {children}
      </div>
      <LockScreen onUnlocked={() => setLocked(false)} />
    </>
  );
}

/**
 * La pantalla de cerrojo, con el lenguaje de la app.
 *
 * La primera versión era el logo flotando en negro y tres enlaces grises
 * casi del mismo peso: no se parecía a ninguna otra pantalla y no se sabía
 * qué tocar. Es un panel sobre la superficie, como los diálogos, con el
 * campo del PIN y las salidas debajo, más calladas.
 */

/** Cada cuánto late el detector de "me congelaron". */
const LATIDO_MS = 2000;

/**
 * Hueco a partir del cual se considera que la app estuvo en segundo plano.
 *
 * Tres latidos. Con menos, una pausa del recolector de basura o un momento
 * de carga pesada podrían leerse como "volvió de segundo plano" y cerrar el
 * cerrojo sin motivo. La contra es que salir y volver en menos de seis
 * segundos no lo dispara por esta vía; los eventos de arriba cubren ese
 * caso cuando llegan.
 */
const HUECO_MINIMO_MS = 6000;

function LockScreen({ onUnlocked }: { onUnlocked: () => void }) {
  const router = useRouter();
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(false);
  const [forgot, setForgot] = useState(false);
  // Se incrementa con cada PIN rechazado para remontar la animación: sin
  // cambiar la `key`, el segundo error no vuelve a sacudir nada.
  const [rejections, setRejections] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const submit = useCallback(
    async (value: string) => {
      setChecking(true);
      setError("");
      const result = await verifyAppPin(value);
      setChecking(false);
      if (result.ok) {
        onUnlocked();
        return;
      }
      setPin("");
      setRejections((n) => n + 1);
      setError(result.error ?? "PIN incorrecto.");
      inputRef.current?.focus();
    },
    [onUnlocked]
  );

  function onPinChange(raw: string) {
    const next = cleanPinInput(raw);
    setPin(next);
    setError("");
    // Se manda solo al completar los seis: un botón "Entrar" acá es un
    // toque de más en algo que se hace varias veces al día.
    //
    // **Hubo un botón para mandar un PIN de cinco dígitos**, de cuando el
    // largo cambió de cinco a seis, para que nadie quedara afuera con el
    // suyo. Camil pidió sacarlo. Si quedara algún PIN de cinco, la salida
    // es el código por correo.
    if (next.length === PIN_LENGTH) void submit(next);
  }

  async function leave() {
    // Lo local primero, igual que en SignOutDialog: la acción puede no
    // llegar sin señal y lo guardado tiene que irse igual.
    try {
      await endSession();
      const result = await signOut();
      router.replace(result.destination);
    } catch {
      router.replace("/entrar");
    }
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-ground px-5 py-8">
      <div className="rise-in flex w-full max-w-[21rem] flex-col items-center">
        <div className="flex w-full flex-col items-center gap-6 rounded-dialog border border-line bg-surface px-6 py-8">
          <div className="flex flex-col items-center gap-4">
            <span className="flex h-14 w-14 items-center justify-center rounded-surface bg-surface-raised">
              <BrandMark size={28} accent />
            </span>
            <div className="flex flex-col items-center gap-1">
              <h1 className="text-heading text-ink">TicoFinanza</h1>
              <p className="text-meta text-ink-3">Escribí tu PIN</p>
            </div>
          </div>

          <div className="flex w-full flex-col items-center gap-4">
            <PinBoxes
              key={rejections}
              value={pin}
              onChange={onPinChange}
              disabled={checking}
              error={Boolean(error)}
              inputRef={inputRef}
            />
            <p role="alert" className="min-h-[1.25rem] text-label font-normal text-expense">
              {checking ? "" : error}
            </p>
          </div>
        </div>

        {/* Las salidas, debajo del panel y más calladas: son el camino de
            atrás, no lo que uno viene a hacer acá. */}
        <div className="flex flex-col items-center gap-0.5 pt-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setForgot(true)}
            disabled={checking}
            className="text-ink-3"
          >
            No me acuerdo del PIN
          </Button>
          <Button variant="ghost" size="sm" onClick={() => void leave()} className="text-ink-3">
            Cerrar sesión
          </Button>
        </div>
      </div>

      <ForgotPinDialog
        open={forgot}
        onClose={() => setForgot(false)}
        // La pantalla de cerrojo es una capa fija a z-200: sin esto el
        // diálogo se dibuja debajo, se ve y no se puede tocar.
        layer="over"
        // Quitado el PIN ya no hay con qué cerrar: se abre.
        onReset={onUnlocked}
      />
    </div>
  );
}

/**
 * Las casillas del PIN.
 *
 * El dibujo son las casillas; lo que recibe las teclas es un solo campo
 * invisible encima. Un campo por dígito obligaría a mover el foco a
 * mano en cada dígito y a pelearse con el borrado hacia atrás.
 *
 * La casilla que sigue lleva el borde de acento, así se ve dónde va a caer
 * lo que escribas: con todas iguales, el campo invisible dejaba la pantalla
 * sin ninguna señal de foco.
 */
function PinBoxes({
  value,
  onChange,
  disabled,
  error,
  inputRef,
}: {
  value: string;
  onChange: (raw: string) => void;
  disabled?: boolean;
  error?: boolean;
  inputRef: React.RefObject<HTMLInputElement | null>;
}) {
  return (
    <div className={`relative w-full ${error ? "shake" : ""}`}>
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        inputMode="numeric"
        autoComplete="off"
        aria-label={`PIN de ${PIN_LENGTH} dígitos`}
        aria-invalid={error || undefined}
        disabled={disabled}
        className="absolute inset-0 h-full w-full cursor-default opacity-0"
      />
      <div className="pointer-events-none flex justify-center gap-2">
        {Array.from({ length: PIN_LENGTH }, (_, i) => {
          const lleno = i < value.length;
          const siguiente = i === value.length && !disabled;
          return (
            <span
              key={i}
              className={`flex h-12 w-full max-w-[2.75rem] items-center justify-center rounded-control border bg-surface-raised transition-[border-color,background-color] duration-150 ${
                error
                  ? "border-expense"
                  : lleno
                    ? "border-line-strong"
                    : siguiente
                      ? "border-accent"
                      : "border-line"
              }`}
            >
              {lleno && (
                <span
                  aria-hidden
                  className={`h-2.5 w-2.5 rounded-full ${error ? "bg-expense" : "bg-ink"}`}
                />
              )}
            </span>
          );
        })}
      </div>
    </div>
  );
}
