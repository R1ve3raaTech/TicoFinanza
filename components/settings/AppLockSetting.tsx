"use client";

import { useRef, useState, useTransition } from "react";
import { removeAppPin, setAppLockWhen, setAppPin } from "@/app/dashboard/ajustes/actions";
import { useToast } from "@/components/Toast";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { FormError, Select } from "@/components/ui/Field";
import { cleanPinInput, isValidPin, LOCK_OPTIONS, type AppLockWhen } from "@/lib/appLock";
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
 */
export function AppLockSetting({
  lockWhen,
  hasPin,
}: {
  lockWhen: AppLockWhen;
  hasPin: boolean;
}) {
  const toast = useToast();
  const [when, setWhen] = useState<AppLockWhen>(lockWhen);
  const [pinSet, setPinSet] = useState(hasPin);
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();

  function changeWhen(value: AppLockWhen) {
    const previous = when;
    setWhen(value);
    startTransition(async () => {
      const result = await setAppLockWhen(value);
      if (result.error) {
        // Vuelve a lo que estaba: dejar el control mostrando algo que no se
        // guardó es la forma más rápida de creer que el cerrojo está puesto
        // cuando no lo está.
        setWhen(previous);
        toast.error(result.error);
      }
    });
  }

  function remove() {
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

  return (
    <>
      <SettingsRow inline label="Pedir al volver a la app" htmlFor="app-lock-when">
        <Select
          id="app-lock-when"
          value={when}
          disabled={pending}
          onChange={(e) => changeWhen(e.target.value as AppLockWhen)}
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
        <Button variant="secondary" size="sm" onClick={() => setEditing(true)} disabled={pending}>
          {pinSet ? "Cambiar" : "Poner PIN"}
        </Button>
        {pinSet && (
          <Button variant="danger-ghost" size="sm" onClick={remove} disabled={pending}>
            Quitar
          </Button>
        )}
      </SettingsRow>

      <PinDialog
        open={editing}
        onClose={() => setEditing(false)}
        onSaved={() => {
          setPinSet(true);
          setEditing(false);
          toast.success("PIN guardado");
        }}
      />
    </>
  );
}

/**
 * Poner el PIN, en dos pasos.
 *
 * Se pide dos veces porque un dígito mal tecleado acá es un cerrojo que no
 * abre después, y la persona no tendría forma de saber cuál puso. Hay
 * salida (la huella, y cerrar sesión), pero enterarse el día que la
 * necesitás es el peor momento.
 */
function PinDialog({
  open,
  onClose,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [first, setFirst] = useState("");
  const [second, setSecond] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const secondRef = useRef<HTMLInputElement>(null);

  const step = isValidPin(first) ? 2 : 1;

  function close() {
    setFirst("");
    setSecond("");
    setError("");
    onClose();
  }

  function onFirst(raw: string) {
    setFirst(cleanPinInput(raw));
    setError("");
    setSecond("");
  }

  function onSecond(raw: string) {
    const next = cleanPinInput(raw);
    setSecond(next);
    setError("");
    if (!isValidPin(next)) return;
    if (next !== first) {
      setError("Los dos PIN no coinciden.");
      setSecond("");
      return;
    }
    startTransition(async () => {
      const result = await setAppPin(next);
      if (result.error) {
        setError(result.error);
        return;
      }
      setFirst("");
      setSecond("");
      onSaved();
    });
  }

  return (
    <Dialog
      open={open}
      onClose={close}
      layer="top"
      size="sm"
      dismissible={!pending}
      title={step === 1 ? "Elegí tu PIN" : "Repetilo"}
      footer={
        <Button variant="secondary" onClick={close} disabled={pending}>
          Cancelar
        </Button>
      }
    >
      <div className="flex flex-col gap-4">
        <PinBoxes
          key={step}
          value={step === 1 ? first : second}
          onChange={step === 1 ? onFirst : onSecond}
          inputRef={step === 2 ? secondRef : undefined}
          disabled={pending}
          label={step === 1 ? "PIN de cinco dígitos" : "Repetí el PIN"}
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
  inputRef,
}: {
  value: string;
  onChange: (raw: string) => void;
  disabled?: boolean;
  label: string;
  inputRef?: React.RefObject<HTMLInputElement | null>;
}) {
  return (
    <div className="relative w-full">
      <input
        ref={inputRef}
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
