"use client";

import { useState, useTransition } from "react";
import { signOut } from "@/app/dashboard/actions";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";

export function SignOutDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [pending, startTransition] = useTransition();

  return (
    <Dialog
      open={open}
      onClose={onClose}
      role="alertdialog"
      size="sm"
      dismissible={!pending}
      title="¿Cerrar sesión?"
      description="Vas a tener que volver a entrar con Google para ver tus movimientos."
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={pending}>
            Cancelar
          </Button>
          <Button
            variant="primary"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                await signOut();
              })
            }
          >
            {pending ? "Cerrando..." : "Cerrar sesión"}
          </Button>
        </>
      }
    />
  );
}

export function SignOutButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
        Cerrar sesión
      </Button>
      <SignOutDialog open={open} onClose={() => setOpen(false)} />
    </>
  );
}
