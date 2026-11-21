"use client";

import { useState, useTransition } from "react";
import { removeAppPin, setAppLockWhen, setAppPin } from "@/app/dashboard/ajustes/actions";
import { ForgotPinDialog } from "@/components/app/ForgotPinDialog";
import { useToast } from "@/components/Toast";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { FormError } from "@/components/ui/Field";
import { Segmented } from "@/components/ui/Segmented";
import {
  cleanPinInput,
  isSubmittablePin,
  isValidPin,
  PIN_LENGTH,
  LOCK_OPTIONS,
  weakensLock,
  type AppLockWhen,
} from "@/lib/appLock";
import { SettingsRow } from "./SettingsSection";

/**
 * El cerrojo del APK, en Ajustes.
 *
 * **Este bloque solo se dibuja dentro del APK** (ver lib/appMode.ts): en la
 * web no hay cerrojo que configurar, ahí sigue el cierre de sesión por
 * inactividad.
 *
 * **El PIN es lo único que abre el cerrojo.** Hubo huella y se quitó: el
 * lector andaba, pero todo lo que lo rodeaba —el puente nativo que puede
 * no estar listo, los avisos de "volví a la app" que no llegan, el camino
 * de "no se pudo preguntar"— fallaba de formas que no se veían. Ver
 * `AppLockGate`.
 *
 * Son seis dígitos. Se guardan hasheados y **se verifican en el servidor**,
 * que lleva el límite de intentos: un hash mandado al navegador se prueba
 * contra el millón de combinaciones en un suspiro.
 *
 * **Aflojar el cerrojo pide el PIN actual, en el APK y en la web.** El caso
 * real es que te agarren el teléfono con la app ya abierta —justo de lo que
 * el cerrojo protege— y desde acá lo apaguen: un rato de acceso prestado
 * quedaría convertido en acceso para siempre. Lo comprueba el servidor.
 *
 * Hubo una versión que no lo pedía desde la web, tomándola como camino de
 * recuperación. Estaba mal: a quien tiene tu teléfono desbloqueado le basta
 * abrir Chrome ahí mismo, donde tu sesión suele estar viva. La recuperación
 * ahora es un código al correo (`ForgotPinDialog`).
 *
 * **Sin PIN puesto no hay cerrojo**, y el "cada cuánto" no hace nada: la
 * app abre directo. Trabar a alguien sin darle con qué volver a entrar
 * sería dejarlo afuera de sus propios datos.
 */
type Prompt =
  | { kind: "cambiar" }
  | { kind: "quitar" }
  | { kind: "aflojar"; to: AppLockWhen };

export function AppLockSetting({ lockWhen, hasPin }: { lockWhen: AppLockWhen; hasPin: boolean }) {
  const toast = useToast();
  const [when, setWhen] = useState<AppLockWhen>(lockWhen);
  const [pinSet, setPinSet] = useState(hasPin);
  const [prompt, setPrompt] = useState<Prompt | null>(null);
  const [forgot, setForgot] = useState(false);
  /**
   * Qué dice el navegador que es, escrito en la pantalla.
   *
   * **Diagnóstico, y temporal.** Hay un desacuerdo entre lo que el
   * servidor decide —si esto es el APK o la web— y lo que la app hace, y
   * desde acá no hay forma de ver el identificador que manda el WebView.
   * Es la misma salida que resolvió el login con Google y el cerrojo: que
   * el dato salga en la pantalla en vez de adivinarlo.
   */
  const [ua, setUa] = useState<string | null>(null);
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

  function changeWhen(value: AppLockWhen) {
    if (!weakensLock(when, value)) {
      applyWhen(value);
      return;
    }
    // **Aflojar el cerrojo cuesta el PIN.** El caso real: te agarran el
    // teléfono con la app recién usada —y por lo tanto abierta— y desde
    // acá se pasa el cerrojo a "Nunca". Un rato de acceso prestado se
    // convertiría en acceso para siempre.
    if (pinSet) {
      setPrompt({ kind: "aflojar", to: value });
      return;
    }
    // Sin PIN no hay cerrojo que aflojar: `AppLockGate` ya deja pasar.
    applyWhen(value);
  }

  return (
    <>
      {/* **El PIN va primero**: sin él, el "cada cuánto" de abajo no hace
          nada, porque el cerrojo no se cierra. Era al revés cuando la
          huella podía abrir sola. */}
      <SettingsRow inline label="PIN de la app">
        <span className="text-meta text-ink-3">{pinSet ? "Puesto" : "Sin poner"}</span>
        <Button
          variant={pinSet ? "secondary" : "primary"}
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
            onClick={() => setPrompt({ kind: "quitar" })}
            disabled={pending}
          >
            Quitar
          </Button>
        )}
      </SettingsRow>

      {/* Control segmentado, el mismo que usa "Tema" dos filas más arriba.
          Antes era un desplegable de formulario: puestos uno sobre otro, se
          notaba que venían de dos apps distintas.

          **Apagado mientras no haya PIN**, porque mientras no lo haya no
          gobierna nada: un control que se puede mover y no cambia nada hace
          creer que el cerrojo está puesto cuando la app abre directo. */}
      <SettingsRow inline label="Pedir al volver a la app">
        <Segmented
          value={when}
          onChange={changeWhen}
          ariaLabel="Pedir al volver a la app"
          disabled={pending || !pinSet}
          options={LOCK_OPTIONS.map((option) => ({ value: option.value, label: option.label }))}
        />
      </SettingsRow>

      <SettingsRow inline label="Identificación">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => {
            const marca = navigator.userAgent.includes("TicoFinanzaApp");
            setUa(`${marca ? "CON marca" : "SIN marca"} · ${navigator.userAgent}`);
          }}
        >
          Ver
        </Button>
      </SettingsRow>
      {ua && (
        <p className="pb-3 text-meta text-ink-3 break-all">{ua}</p>
      )}

      {prompt && (
        <PinFlow
          prompt={prompt}
          needsCurrent={pinSet}
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
          onForgot={() => {
            setPrompt(null);
            setForgot(true);
          }}
        />
      )}

      <ForgotPinDialog
        open={forgot}
        onClose={() => setForgot(false)}
        onReset={() => {
          setForgot(false);
          setPinSet(false);
          toast.success("PIN quitado");
        }}
      />
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
 * puso. Hay salida (el código por correo, y cerrar sesión), pero enterarse el día que
 * lo necesitás es el peor momento.
 */
function PinFlow({
  prompt,
  needsCurrent,
  onClose,
  onDone,
  onWeaken,
  onForgot,
}: {
  prompt: Prompt;
  needsCurrent: boolean;
  onClose: () => void;
  onDone: (message: string, changed?: "puesto" | "quitado") => void;
  onWeaken: (to: AppLockWhen, currentPin: string) => void;
  onForgot: () => void;
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

  /**
   * ¿Este valor ya se puede mandar?
   *
   * **El PIN actual y un PIN nuevo no se miden igual.** Un PIN nuevo son
   * seis dígitos. Pero el actual puede ser uno de los viejos, de cinco: si
   * acá se exigieran seis, quien lo tenga así **no podría cambiarlo ni
   * quitarlo nunca** — el cambio de largo le trabaría su propio cerrojo.
   */
  const completo = (v: string) =>
    which === "actual" ? isSubmittablePin(v) : isValidPin(v);

  function onChange(raw: string) {
    const next = cleanPinInput(raw);
    setValue(next);
    setError("");
    // Con seis dígitos se manda solo. Con cinco —un PIN de los viejos— hay
    // un botón, porque no se sabe si terminó de escribir.
    if (isValidPin(next)) enviar(next);
  }

  function enviar(next: string) {
    setError("");

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

        {/* Solo con un PIN de los viejos, de cinco dígitos: con seis el
            envío es automático y este botón nunca aparece. */}
        {completo(value) && !isValidPin(value) && (
          <Button variant="primary" onClick={() => enviar(value)} disabled={pending}>
            Continuar
          </Button>
        )}

        {/* La salida cuando no te acordás. Sin esto, exigir el PIN para
            quitarlo deja la app trabada para siempre en ese teléfono. */}
        {which === "actual" && (
          <Button variant="ghost" size="sm" onClick={onForgot} disabled={pending}>
            No me acuerdo del PIN
          </Button>
        )}
      </div>
    </Dialog>
  );
}

/**
 * Las casillas del PIN, con un solo campo invisible encima.
 *
 * Un campo por dígito obligaría a mover el foco a mano en cada dígito y
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
      <div className="pointer-events-none flex justify-center gap-2">
        {Array.from({ length: PIN_LENGTH }, (_, i) => (
          <span
            key={i}
            className={`flex h-12 w-full max-w-[2.75rem] items-center justify-center rounded-control border transition-colors duration-150 ${
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
