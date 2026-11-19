"use client";

import { useState, useTransition } from "react";
import { requestPinResetCode, resetAppPinWithCode } from "@/app/dashboard/ajustes/actions";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { FormError, inputClass } from "@/components/ui/Field";

/**
 * Recuperar un PIN olvidado, con un código al correo de la cuenta.
 *
 * **Es la única salida que queda**, y por eso existe: quitar el PIN exige
 * saberlo en todos lados —en el APK y en la web—, así que sin esto un PIN
 * olvidado dejaría la app trabada para siempre en ese teléfono. Hubo una
 * versión que permitía quitarlo sin más desde la web; estaba mal, porque a
 * quien te agarra el teléfono desbloqueado le basta abrir Chrome ahí mismo.
 *
 * El código va al correo **verificado** de la cuenta, el que confirmó
 * Google al entrar — no a uno que se pueda escribir a mano. Es la prueba de
 * identidad que el servidor sí puede comprobar.
 *
 * **Lo que esto no resuelve, dicho claro**: alguien con tu teléfono
 * desbloqueado puede pedir el código y leerlo en tu propio correo. Es un
 * escalón más alto que abrir Chrome, deja rastro en tu bandeja, y es el
 * mismo compromiso que toman las apps que hacen esto. La defensa de verdad
 * contra ese caso es que el teléfono tenga su propio bloqueo.
 */
export function ForgotPinDialog({
  open,
  onClose,
  onReset,
  layer = "top",
}: {
  open: boolean;
  onClose: () => void;
  /** El PIN quedó quitado. */
  onReset: () => void;
  /** "over" cuando se abre desde la pantalla de cerrojo, que vive a z-200. */
  layer?: "top" | "over";
}) {
  const [sent, setSent] = useState(false);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function send() {
    setError("");
    startTransition(async () => {
      const result = await requestPinResetCode();
      if (result.error) {
        setError(result.error);
        return;
      }
      setSent(true);
    });
  }

  function confirm() {
    setError("");
    startTransition(async () => {
      const result = await resetAppPinWithCode(code.trim());
      if (result.error) {
        setError(result.error);
        return;
      }
      onReset();
    });
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      layer={layer}
      size="sm"
      dismissible={!pending}
      title="Quitar el PIN"
      description={
        sent
          ? "Te mandamos un código al correo de tu cuenta."
          : "Te vamos a mandar un código al correo de tu cuenta para quitarlo. No se borra ningún dato."
      }
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={pending}>
            Cancelar
          </Button>
          {sent ? (
            <Button variant="primary" onClick={confirm} disabled={pending || code.trim().length < 8}>
              {pending ? "Quitando..." : "Quitar el PIN"}
            </Button>
          ) : (
            <Button variant="primary" onClick={send} disabled={pending}>
              {pending ? "Enviando..." : "Mandarme el código"}
            </Button>
          )}
        </>
      }
    >
      <div className="flex flex-col gap-3">
        {sent && (
          <input
            data-autofocus=""
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 8))}
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="12345678"
            aria-label="Código de 8 dígitos"
            className={`${inputClass} money text-center tracking-[0.3em]`}
          />
        )}
        <FormError>{error}</FormError>
      </div>
    </Dialog>
  );
}
