"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "@/app/dashboard/actions";
import { Button } from "@/components/ui/Button";
import { GENERIC_ERROR } from "@/lib/errors";
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
      // Se abre dentro del diálogo de ajustes: sin esto comparten capa.
      layer="top"
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
                try {
                  // Primero lo local, igual que en IdleLogout: la acción
                  // puede no llegar si no hay red, y las pantallas
                  // guardadas tienen que irse igual.
                  //
                  // Va DENTRO del try: estaba afuera, así que si la
                  // limpieza fallaba, el error escapaba de la transición y
                  // el botón se quedaba en "Cerrando..." para siempre, sin
                  // cerrar sesión y sin decir nada. `endSession` además
                  // tiene tope de tiempo propio (ver lib/pageCache.ts).
                  await endSession();
                  const result = await signOut();
                  router.replace(result.destination);
                } catch {
                  setError(GENERIC_ERROR);
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
