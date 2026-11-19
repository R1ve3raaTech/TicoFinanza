"use client";

import { useState, useTransition } from "react";
import { removeAppPin, setAppLockWhen, setAppPin } from "@/app/dashboard/ajustes/actions";
import { useToast } from "@/components/Toast";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { FormError, Select } from "@/components/ui/Field";
import {
  cleanPinInput,
  isValidPin,
  LOCK_OPTIONS,
  weakensLock,
  type AppLockWhen,
} from "@/lib/appLock";
import { unlockWithBiometrics } from "@/lib/native";
import { SettingsRow } from "./SettingsSection";

/**
 * El cerrojo del APK, en Ajustes.
 *
 * **Este bloque solo se dibuja dentro del APK** (ver lib/appMode.ts): en la
 * web no hay cerrojo que configurar, ahí sigue el cierre de sesión por
 * inactividad.
 *
 * El PIN es el respaldo de la huella, para un teléfono que no tiene ninguna
 * registrada. Se guarda hasheado y **se verifica en el servidor**, que
 * lleva el límite de intentos: un hash mandado al navegador se prueba
 * contra las cien mil combinaciones de cinco dígitos en un suspiro.
 *
 * **Aflojar el cerrojo pide identificarse de nuevo, pero solo desde el
 * APK.** El caso real es que te agarren el teléfono con la app ya abierta
 * —justo de lo que el cerrojo protege— y desde acá lo apaguen: un rato de
 * acceso prestado quedaría convertido en acceso para siempre. Con PIN
 * puesto lo comprueba el servidor; sin PIN, lo único que hay es volver a
 * pedir la huella, que es un control del lado del teléfono y por lo tanto
 * más débil — es lo que permite la plataforma sin meter un intercambio de
 * llaves nativo.
 *
 * **Desde la web no se pide**, y es a propósito: es el camino de
 * recuperación. Si el PIN se olvida y quitarlo exigiera saberlo, la app
 * quedaría trabada para siempre en ese teléfono. Quien entra por la web ya
 * tiene tu sesión de Google en una computadora, o sea que ya puede leer
 * todo: pedirle el PIN no protegería nada. Quien decide es el servidor,
 * mirando de dónde viene el pedido; la pantalla no puede saltárselo.
 */
type Prompt =
  | { kind: "cambiar" }
  | { kind: "quitar" }
  | { kind: "aflojar"; to: AppLockWhen };

export function AppLockSetting({
  lockWhen,
  hasPin,
  isApp,
}: {
  lockWhen: AppLockWhen;
  hasPin: boolean;
  /** Fuera del APK no se piden PIN: ver el comentario de arriba. */
  isApp: boolean;
}) {
  const toast = useToast();
  const [when, setWhen] = useState<AppLockWhen>(lockWhen);
  const [pinSet, setPinSet] = useState(hasPin);
  const [prompt, setPrompt] = useState<Prompt | null>(null);
  const [pending, startTransition] = useTransition();

  /** Guarda el "cada cuánto". `currentPin` solo viaja si el cambio afloja. */
  function applyWhen(value: AppLockWhen, currentPin?: string) {
    const previous = when;
    setWhen(value);
    startTransition(async () => {
      const result = await setAppLockWhen(value, currentPin);
      if (result.error) {
        // Vuelve a lo que estaba: dejar el control mostrando algo que no se
        // guardó es la forma más rápida de creer que el cerrojo está puesto
        // cuando no lo está.
        setWhen(previous);
        toast.error(result.error);
      }
    });
  }

  /** Quitar el PIN. Desde la web va directo: es la recuperación. */
  function removeDirectly() {
    startTransition(async () => {
      const result = await removeAppPin();
      if (result.error) {
        toast.error(result.error);
        return;
      }
      setPinSet(false);
      toast.success("PIN quitado");
    });
  }

  async function changeWhen(value: AppLockWhen) {
    if (!isApp || !weakensLock(when, value)) {
      applyWhen(value);
      return;
    }
    if (pinSet) {
      setPrompt({ kind: "aflojar", to: value });
      return;
    }
    // Sin PIN, el único control posible es la huella de este teléfono.
    const result = await unlockWithBiometrics("Confirmá para aflojar el cerrojo");
    if (result === "cancelado") return;
    applyWhen(value);
  }

  return (
    <>
      <SettingsRow inline label="Pedir al volver a la app" htmlFor="app-lock-when">
        <Select
          id="app-lock-when"
          value={when}
          disabled={pending}
          onChange={(e) => void changeWhen(e.target.value as AppLockWhen)}
          className="w-[11rem]"
        >
          {LOCK_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      </SettingsRow>

      <SettingsRow inline label="PIN de respaldo">
        <span className="text-meta text-ink-3">{pinSet ? "Puesto" : "Sin poner"}</span>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setPrompt({ kind: "cambiar" })}
          disabled={pending}
        >
          {pinSet ? "Cambiar" : "Poner PIN"}
        </Button>
        {pinSet && (
          <Button
            variant="danger-ghost"
            size="sm"
            onClick={() => (isApp ? setPrompt({ kind: "quitar" }) : removeDirectly())}
            disabled={pending}
          >
            Quitar
          </Button>
        )}
      </SettingsRow>

      {prompt && (
        <PinFlow
          prompt={prompt}
          needsCurrent={pinSet && isApp}
          onClose={() => setPrompt(null)}
          onDone={(message, changed) => {
            setPrompt(null);
            if (changed === "puesto") setPinSet(true);
            if (changed === "quitado") setPinSet(false);
            toast.success(message);
          }}
          onWeaken={(to, currentPin) => {
            setPrompt(null);
            applyWhen(to, currentPin);
          }}
        />
      )}
    </>
  );
}

/** Los pasos que hace falta recorrer según lo que se esté haciendo. */
function stepsFor(prompt: Prompt, needsCurrent: boolean): ("actual" | "nuevo" | "repetir")[] {
  if (prompt.kind === "cambiar") {
    return needsCurrent ? ["actual", "nuevo", "repetir"] : ["nuevo", "repetir"];
  }
  return ["actual"];
}

const TITLES = {
  actual: "Escribí tu PIN actual",
  nuevo: "Elegí tu PIN",
  repetir: "Repetilo",
} as const;

/**
 * El diálogo del PIN, con los pasos que haga falta.
 *
 * Al poner uno nuevo se pide dos veces: un dígito mal tecleado acá es un
 * cerrojo que no abre después, y la persona no tendría forma de saber cuál
 * puso. Hay salida (la huella, y cerrar sesión), pero enterarse el día que
 * lo necesitás es el peor momento.
 */
function PinFlow({
  prompt,
  needsCurrent,
  onClose,
  onDone,
  onWeaken,
}: {
  prompt: Prompt;
  needsCurrent: boolean;
  onClose: () => void;
  onDone: (message: string, changed?: "puesto" | "quitado") => void;
  onWeaken: (to: AppLockWhen, currentPin: string) => void;
}) {
  const steps = stepsFor(prompt, needsCurrent);
  const [step, setStep] = useState(0);
  const [current, setCurrent] = useState("");
  const [fresh, setFresh] = useState("");
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  const which = steps[step];

  function advance(nextCurrent = current, nextFresh = fresh) {
    setCurrent(nextCurrent);
    setFresh(nextFresh);
    setValue("");
    setStep((s) => s + 1);
  }

  function onChange(raw: string) {
    const next = cleanPinInput(raw);
    setValue(next);
    setError("");
    if (!isValidPin(next)) return;

    if (which === "actual") {
      // El PIN actual no se comprueba acá: viaja con la operación y lo
      // verifica el servidor. Comprobarlo aparte sería un viaje de más y
      // gastaría un intento del límite por gusto.
      if (prompt.kind === "cambiar") {
        advance(next, "");
        return;
      }
      if (prompt.kind === "aflojar") {
        onWeaken(prompt.to, next);
        return;
      }
      startTransition(async () => {
        const result = await removeAppPin(next);
        if (result.error) {
          setValue("");
          setError(result.error);
          return;
        }
        onDone("PIN quitado", "quitado");
      });
      return;
    }

    if (which === "nuevo") {
      advance(current, next);
      return;
    }

    // "repetir"
    if (next !== fresh) {
      setValue("");
      setError("Los dos PIN no coinciden.");
      return;
    }
    startTransition(async () => {
      const result = await setAppPin(next, needsCurrent ? current : undefined);
      if (result.error) {
        setValue("");
        setError(result.error);
        // Un PIN actual equivocado se descubre recién acá: se vuelve al
        // principio, que es donde se puede corregir.
        if (needsCurrent) setStep(0);
        return;
      }
      onDone("PIN guardado", "puesto");
    });
  }

  return (
    <Dialog
      open
      onClose={onClose}
      layer="top"
      size="sm"
      dismissible={!pending}
      title={TITLES[which]}
      footer={
        <Button variant="secondary" onClick={onClose} disabled={pending}>
          Cancelar
        </Button>
      }
    >
      <div className="flex flex-col gap-4">
        <PinBoxes
          // Remonta el campo en cada paso: si no, el valor anterior se
          // quedaría escrito debajo del título nuevo.
          key={`${which}-${step}`}
          value={value}
          onChange={onChange}
          disabled={pending}
          label={TITLES[which]}
        />
        <FormError>{error}</FormError>
      </div>
    </Dialog>
  );
}

/**
 * Cinco casillas con un solo campo invisible encima.
 *
 * Cinco campos de verdad obligarían a mover el foco a mano en cada dígito y
 * a pelearse con el borrado hacia atrás, que es donde esos controles
 * siempre fallan.
 */
function PinBoxes({
  value,
  onChange,
  disabled,
  label,
}: {
  value: string;
  onChange: (raw: string) => void;
  disabled?: boolean;
  label: string;
}) {
  return (
    <div className="relative w-full">
      <input
        data-autofocus=""
        value={value}
        onChange={(e) => onChange(e.target.value)}
        inputMode="numeric"
        autoComplete="off"
        aria-label={label}
        disabled={disabled}
        className="absolute inset-0 h-full w-full cursor-default opacity-0"
      />
      <div className="pointer-events-none flex justify-center gap-2.5">
        {Array.from({ length: 5 }, (_, i) => (
          <span
            key={i}
            className={`flex h-12 w-10 items-center justify-center rounded-control border transition-colors duration-150 ${
              i < value.length ? "border-accent bg-surface" : "border-line bg-surface-raised"
            }`}
          >
            {i < value.length && <span aria-hidden className="h-2.5 w-2.5 rounded-full bg-ink" />}
          </span>
        ))}
      </div>
    </div>
  );
}
