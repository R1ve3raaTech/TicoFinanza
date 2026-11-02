"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "@/app/dashboard/actions";
import { Button } from "@/components/ui/Button";
import { endSession } from "@/lib/pageCache";
import { Dialog } from "@/components/ui/Dialog";

export function SignOutDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  return (
    <Dialog
      open={open}
      onClose={onClose}
      role="alertdialog"
      size="sm"
      dismissible={!pending}
      title="¿Cerrar sesión?"
      description="Vas a tener que volver a iniciar sesión para ver tus movimientos."
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
                setError("");
                // Primero lo local, igual que en IdleLogout: la acción
                // puede no llegar si no hay red, y las pantallas
                // guardadas tienen que irse igual. Estaba después del
                // `await signOut()`, o sea que un fallo de red dejaba
                // todo guardado.
                await endSession();
                try {
                  const result = await signOut();
                  router.replace(result.destination);
                } catch {
                  setError("No pudimos conectar para cerrar sesión. Intentá de nuevo.");
                }
              })
            }
          >
            {pending ? "Cerrando..." : "Cerrar sesión"}
          </Button>
        </>
      }
    >
      {error && <p role="alert" className="text-sm text-expense">{error}</p>}
    </Dialog>
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
