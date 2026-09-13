"use client";

import { useId, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash } from "@phosphor-icons/react";
import {
  confirmAccountDeletion,
  requestAccountDeletionCode,
} from "@/app/dashboard/settings/actions";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Field, FormError, inputClass } from "@/components/ui/Field";
import { SettingsRow } from "./SettingsSection";

const CONFIRM_WORD = "ELIMINAR";

type Step = "warn" | "sent" | "deleted";

export function DeleteAccountFlow({ email }: { email: string }) {
  const router = useRouter();
  const formId = useId();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("warn");
  const [code, setCode] = useState("");
  const [typed, setTyped] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function close() {
    if (pending || step === "deleted") return;
    setOpen(false);
    setStep("warn");
    setCode("");
    setTyped("");
    setError(null);
  }

  function sendCode() {
    setError(null);
    startTransition(async () => {
      const result = await requestAccountDeletionCode();
      if (result.error) {
        setError(result.error);
      } else {
        setStep("sent");
      }
    });
  }

  function confirm() {
    setError(null);
    startTransition(async () => {
      const result = await confirmAccountDeletion(code);
      if (result.error) {
        setError(result.error);
      } else {
        setStep("deleted");
        setTimeout(() => router.push("/"), 1800);
      }
    });
  }

  const canConfirm = code.length === 8 && typed === CONFIRM_WORD;

  const titles: Record<Step, string> = {
    warn: "¿Eliminar tu cuenta para siempre?",
    sent: "Revisá tu correo",
    deleted: "Cuenta eliminada",
  };

  return (
    <>
      <SettingsRow
        inline
        label="Eliminar cuenta"
        description="Borra tu cuenta y todos tus datos para siempre. No se puede deshacer."
      >
        <Button
          variant="danger-ghost"
          size="sm"
          onClick={() => setOpen(true)}
          className="border border-expense/30"
        >
          <Trash size={14} />
          Eliminar cuenta
        </Button>
      </SettingsRow>

      <Dialog
        open={open}
        onClose={close}
        role="alertdialog"
        size="sm"
        dismissible={!pending && step !== "deleted"}
        title={titles[step]}
        footer={
          step === "warn" ? (
            <>
              <Button variant="secondary" onClick={close} disabled={pending}>
                Cancelar
              </Button>
              <Button variant="danger" onClick={sendCode} disabled={pending}>
                {pending ? "Enviando..." : "Mandar código"}
              </Button>
            </>
          ) : step === "sent" ? (
            <>
              <Button variant="secondary" onClick={close} disabled={pending}>
                Cancelar
              </Button>
              <Button variant="danger" type="submit" form={formId} disabled={pending || !canConfirm}>
                {pending ? "Eliminando..." : "Eliminar cuenta"}
              </Button>
            </>
          ) : undefined
        }
      >
        {step === "warn" && (
          <div className="flex flex-col gap-3 text-sm leading-relaxed text-ink-2">
            <p>
              Se borran tus movimientos, categorías, presupuestos, metas y la conexión con Gmail.
              No hay forma de recuperarlo después.
            </p>
            <p className="text-ink-3">
              Te vamos a mandar un código de un solo uso a{" "}
              <span className="text-ink">{email}</span> para confirmar que sos vos.
            </p>
            <FormError>{error}</FormError>
          </div>
        )}

        {step === "sent" && (
          <form
            id={formId}
            onSubmit={(e) => {
              e.preventDefault();
              if (canConfirm) confirm();
            }}
            className="flex flex-col gap-4"
          >
            <p className="text-sm text-ink-2">
              Te mandamos un código de 8 dígitos a {email}. Vence en 10 minutos.
            </p>
            <Field label="Código de 8 dígitos">
              <input
                data-autofocus=""
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 8))}
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="00000000"
                className={`${inputClass} font-mono tracking-[0.2em]`}
              />
            </Field>
            <Field
              label={
                <>
                  Escribí{" "}
                  <span className="font-mono font-semibold text-expense">{CONFIRM_WORD}</span> para
                  confirmar
                </>
              }
            >
              <input
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                autoComplete="off"
                autoCapitalize="characters"
                className={inputClass}
              />
            </Field>
            <FormError>{error}</FormError>
            <Button
              variant="ghost"
              size="sm"
              onClick={sendCode}
              disabled={pending}
              className="-ml-2 self-start"
            >
              Reenviar código
            </Button>
          </form>
        )}

        {step === "deleted" && (
          <p role="status" className="text-sm text-ink-2">
            Todos tus datos fueron borrados. Te llevamos al inicio...
          </p>
        )}
      </Dialog>
    </>
  );
}
