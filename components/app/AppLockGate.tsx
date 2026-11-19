"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Fingerprint, LockKey } from "@phosphor-icons/react";
import { signOut } from "@/app/dashboard/actions";
import { verifyAppPin } from "@/app/dashboard/ajustes/actions";
import { BrandMark } from "@/components/brand/BrandMark";
import { Button } from "@/components/ui/Button";
import { cleanPinInput, isValidPin, lockEnabled, shouldAskOnReturn, type AppLockWhen } from "@/lib/appLock";
import { endSession } from "@/lib/pageCache";
import { unlockWithBiometrics } from "@/lib/native";

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

  // Cuándo se fue la app a segundo plano. Se compara contra el reloj y no
  // con un temporizador: si Android congela la app, un `setTimeout` se
  // congela con ella y al volver nunca vencería.
  const hiddenAt = useRef<number | null>(null);

  const runBiometrics = useCallback(async () => {
    const result = await unlockWithBiometrics("Desbloqueá TicoFinanza");
    setAsking(false);

    if (result === "ok") {
      setLocked(false);
      setShowPin(false);
      return;
    }
    // Sin huella en este teléfono (o sin envoltorio nativo todavía): el
    // único camino es el PIN. Si no hay PIN puesto no hay con qué cerrar,
    // así que se abre: ver el comentario de arriba.
    if (result === "no-disponible") {
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
        showPin={showPin}
        hasPin={hasPin}
        onRetry={askAgain}
        onUnlocked={() => setLocked(false)}
        onUsePin={() => setShowPin(true)}
      />
    </>
  );
}

function LockScreen({
  asking,
  showPin,
  hasPin,
  onRetry,
  onUnlocked,
  onUsePin,
}: {
  asking: boolean;
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
    <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center gap-8 bg-ground px-6">
      <BrandMark size={44} accent />

      {showPin ? (
        <div className="flex w-full max-w-[18rem] flex-col items-center gap-5">
          <p className="text-label text-ink-2">Escribí tu PIN</p>

          {/* Las cinco casillas son el dibujo; lo que recibe las teclas es
              un solo campo invisible encima. Cinco campos de verdad
              obligarían a mover el foco a mano en cada dígito y pelearse
              con el borrado. */}
          <div className="relative w-full">
            <input
              ref={inputRef}
              value={pin}
              onChange={(e) => onPinChange(e.target.value)}
              inputMode="numeric"
              autoComplete="off"
              aria-label="PIN de cinco dígitos"
              disabled={checking}
              className="absolute inset-0 h-full w-full cursor-default opacity-0"
            />
            <div className="pointer-events-none flex justify-center gap-2.5">
              {Array.from({ length: 5 }, (_, i) => (
                <span
                  key={i}
                  className={`h-12 w-10 rounded-control border transition-colors duration-150 ${
                    i < pin.length ? "border-accent bg-surface" : "border-line bg-surface-raised"
                  } flex items-center justify-center`}
                >
                  {i < pin.length && (
                    <span aria-hidden className="h-2.5 w-2.5 rounded-full bg-ink" />
                  )}
                </span>
              ))}
            </div>
          </div>

          <p role="alert" className="min-h-[1.25rem] text-label font-normal text-expense">
            {checking ? "" : error}
          </p>

          <Button variant="ghost" size="sm" onClick={onRetry} disabled={checking}>
            <Fingerprint size={15} />
            Usar la huella
          </Button>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-5">
          <LockKey size={28} weight="fill" aria-hidden className="text-ink-3" />
          <p className="text-center text-base text-ink-2">
            {asking ? "Esperando tu huella..." : "TicoFinanza está bloqueada"}
          </p>
          <div className="flex flex-col items-center gap-2">
            <Button variant="primary" onClick={onRetry} disabled={asking}>
              <Fingerprint size={16} />
              Desbloquear
            </Button>
            {hasPin && (
              <Button variant="ghost" size="sm" onClick={onUsePin} disabled={asking}>
                Usar el PIN
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Un PIN olvidado no puede ser el final del camino. */}
      <Button variant="ghost" size="sm" onClick={() => void leave()} className="text-ink-3">
        Cerrar sesión
      </Button>
    </div>
  );
}
