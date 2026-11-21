"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Fingerprint, LockKey } from "@phosphor-icons/react";
import { signOut } from "@/app/dashboard/actions";
import { verifyAppPin } from "@/app/dashboard/ajustes/actions";
import { BrandMark } from "@/components/brand/BrandMark";
import { ForgotPinDialog } from "./ForgotPinDialog";
import { Button } from "@/components/ui/Button";
import { cleanPinInput, isValidPin, lockEnabled, shouldAskOnReturn, type AppLockWhen } from "@/lib/appLock";
import { endSession } from "@/lib/pageCache";
import { unlockWithBiometrics, type EtapaBiometria } from "@/lib/native";

/**
 * El cerrojo del APK: huella o cara, y el PIN de cinco dígitos como
 * respaldo.
 *
 * **Esto es un cerrojo de pantalla, no cifrado.** Frena a quien agarra el
 * teléfono desbloqueado, que es el caso real por el que existe. Quien pueda
 * extraer el almacenamiento del dispositivo no pasa por acá. Protegerlo de
 * verdad pediría guardar la sesión en el almacén seguro de Android y
 * entregársela a la app recién después de la huella, que es bastante más
 * trabajo y vive del lado nativo.
 *
 * Reemplaza al cierre por inactividad **solo dentro del APK**: ahí la
 * sesión se queda viva (es tu teléfono, no una compu prestada) y lo que
 * protege es esto. En la web sigue el cierre a los 15 minutos.
 *
 * **Si no hay con qué abrir, no se cierra.** Un teléfono sin huella
 * registrada y sin PUESTO un PIN deja pasar: trabar a alguien afuera de sus
 * propios datos es peor que el riesgo que se evitaría. Y aun con cerrojo
 * siempre está la salida de cerrar sesión, porque un PIN olvidado no puede
 * ser el final del camino.
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
  const enabled = lockEnabled(lockWhen);
  const [locked, setLocked] = useState(enabled);
  // Arranca en `enabled` porque al abrir la app ya se está pidiendo: así el
  // efecto de abajo no tiene que tocar el estado antes de su primer await,
  // que es justo lo que el compilador de React no permite.
  const [asking, setAsking] = useState(enabled);
  const [showPin, setShowPin] = useState(false);
  /** Qué falló al pedir la huella, para mostrarlo en la pantalla. */
  const [issue, setIssue] = useState<string | null>(null);
  /** En qué paso va el intento, para que la pantalla lo diga. */
  const [etapa, setEtapa] = useState<EtapaBiometria>("cargando");

  // Cuándo se fue la app a segundo plano. Se compara contra el reloj y no
  // con un temporizador: si Android congela la app, un `setTimeout` se
  // congela con ella y al volver nunca vencería.
  const hiddenAt = useRef<number | null>(null);

  const runBiometrics = useCallback(async () => {
    const { estado, detalle } = await unlockWithBiometrics("Desbloqueá TicoFinanza", setEtapa);
    setAsking(false);
    setIssue(detalle ?? null);

    if (estado === "ok") {
      setLocked(false);
      setShowPin(false);
      return;
    }
    // **Esta es la única rama que abre la app sin identificar a nadie**, y
    // por eso "no-disponible" quiere decir una sola cosa muy concreta: el
    // sistema contestó que este teléfono no tiene huella registrada. Ahí no
    // hay con qué cerrar, y trabar a alguien afuera de sus propios datos
    // sería peor que el riesgo.
    //
    // Todo lo demás —cancelar, fallar el dedo, el bloqueo de Android tras
    // varios intentos, un plugin que no carga— cae más abajo y se queda
    // cerrado. Tratar el bloqueo por intentos como "no hay huella" fue un
    // agujero real: fallar cinco veces abría la app. Ver lib/native.ts.
    if (estado === "no-disponible") {
      if (hasPin) setShowPin(true);
      else setLocked(false);
      return;
    }
    // Canceló o la huella no coincidió: se queda cerrado, con el botón
    // para reintentar y, si lo tiene, el PIN.
    setShowPin(hasPin);
  }, [hasPin]);

  /** Volver a pedir la huella desde un botón o al volver a la app. */
  const askAgain = useCallback(() => {
    setIssue(null);
    setEtapa("cargando");
    setAsking(true);
    void runBiometrics();
  }, [runBiometrics]);

  // Arranque en frío: si hay cerrojo, se pide de una.
  //
  // El lint marca esto como "setState dentro de un efecto" porque sigue la
  // llamada hacia adentro y encuentra un setState. Acá no lo es: lo primero
  // que hace `runBiometrics` es esperar al diálogo del sistema, así que el
  // estado cambia cuando la persona pone el dedo —un evento suyo, en otro
  // tick— y no durante este render. Es la forma normal de arrancar trabajo
  // asíncrono desde un efecto.
  useEffect(() => {
    if (!enabled) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void runBiometrics();
  }, [enabled, runBiometrics]);

  // Volver a la app después de un rato afuera.
  useEffect(() => {
    if (!enabled) return;

    function onVisibility() {
      if (document.visibilityState === "hidden") {
        hiddenAt.current = Date.now();
        return;
      }
      const since = hiddenAt.current;
      hiddenAt.current = null;
      if (since === null) return;
      if (!shouldAskOnReturn(lockWhen, Date.now() - since)) return;
      setLocked(true);
      setShowPin(false);
      askAgain();
    }

    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [enabled, lockWhen, askAgain]);

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
      <LockScreen
        asking={asking}
        etapa={etapa}
        issue={issue}
        showPin={showPin}
        hasPin={hasPin}
        onRetry={askAgain}
        onUnlocked={() => setLocked(false)}
        onUsePin={() => setShowPin(true)}
      />
    </>
  );
}

/**
 * La pantalla de cerrojo, con el lenguaje de la app.
 *
 * La primera versión era el logo flotando en negro y tres enlaces grises
 * casi del mismo peso, uno debajo de otro: no se parecía a ninguna otra
 * pantalla y no se sabía qué tocar. Ahora es un panel sobre la superficie,
 * como los diálogos, con **una sola acción principal** y el resto callado
 * abajo — la misma regla que el resto de la app.
 */
/**
 * Qué está haciendo, paso a paso.
 *
 * Decir siempre "Esperando tu huella..." escondía dónde se trababa: si el
 * lector no carga, si el sistema no contesta o si el diálogo nunca aparece
 * son tres fallas distintas con tres arreglos distintos, y desde adentro
 * del APK no hay consola para distinguirlas.
 */
const ETAPA_TEXTO: Record<EtapaBiometria, string> = {
  cargando: "Abriendo el lector de huella...",
  consultando: "Consultando el lector...",
  esperando: "Esperando tu huella...",
};

function LockScreen({
  asking,
  etapa,
  issue,
  showPin,
  hasPin,
  onRetry,
  onUnlocked,
  onUsePin,
}: {
  asking: boolean;
  etapa: EtapaBiometria;
  /** Qué falló al pedir la huella, si falló. */
  issue: string | null;
  showPin: boolean;
  hasPin: boolean;
  onRetry: () => void;
  onUnlocked: () => void;
  onUsePin: () => void;
}) {
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
    if (showPin) inputRef.current?.focus();
  }, [showPin]);

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
    // Se manda solo al completar los cinco: un botón "Entrar" acá es un
    // toque de más en algo que se hace varias veces al día.
    if (isValidPin(next)) void submit(next);
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
              <p aria-live="polite" className="text-meta text-ink-3">
                {showPin
                  ? "Escribí tu PIN"
                  : asking
                    ? ETAPA_TEXTO[etapa]
                    : "Tocá para desbloquear"}
              </p>
            </div>
          </div>

          {showPin ? (
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
          ) : (
            /* Una sola acción principal, como en cualquier otra pantalla. */
            <div className="flex w-full flex-col items-center gap-2">
              <Button
                variant="primary"
                className="h-11 w-full"
                onClick={onRetry}
                disabled={asking}
              >
                <Fingerprint size={18} />
                Desbloquear
              </Button>
              {issue && (
                <p role="alert" className="text-center text-meta leading-snug text-expense">
                  {issue}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Las salidas, debajo del panel y más calladas: son el camino de
            atrás, no lo que uno viene a hacer acá.

            **"Usar el PIN" nunca va deshabilitado, ni mientras espera la
            huella.** El diálogo del sistema es modal: si aparece, tapa
            esto y no se puede tocar igual; si NO aparece —que es justo
            cuando hace falta— este enlace es la única salida. Estuvo
            deshabilitado mientras se pedía la huella, y una vez que el
            diálogo no apareció la pantalla quedó sin escape, diciendo
            "esperando tu huella..." para siempre. */}
        <div className="flex flex-col items-center gap-0.5 pt-4">
          {showPin ? (
            <Button variant="ghost" size="sm" onClick={onRetry} disabled={checking}>
              <Fingerprint size={14} />
              Usar la huella
            </Button>
          ) : (
            hasPin && (
              <Button variant="ghost" size="sm" onClick={onUsePin}>
                <LockKey size={14} />
                Usar el PIN
              </Button>
            )
          )}
          {hasPin && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setForgot(true)}
              disabled={checking}
              className="text-ink-3"
            >
              No me acuerdo del PIN
            </Button>
          )}
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
 * Las cinco casillas del PIN.
 *
 * El dibujo son las casillas; lo que recibe las teclas es un solo campo
 * invisible encima. Cinco campos de verdad obligarían a mover el foco a
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
        aria-label="PIN de cinco dígitos"
        aria-invalid={error || undefined}
        disabled={disabled}
        className="absolute inset-0 h-full w-full cursor-default opacity-0"
      />
      <div className="pointer-events-none flex justify-center gap-2.5">
        {Array.from({ length: 5 }, (_, i) => {
          const lleno = i < value.length;
          const siguiente = i === value.length && !disabled;
          return (
            <span
              key={i}
              className={`flex h-12 w-10 items-center justify-center rounded-control border bg-surface-raised transition-[border-color,background-color] duration-150 ${
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
