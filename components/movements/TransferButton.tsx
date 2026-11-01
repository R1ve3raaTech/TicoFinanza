"use client";

import { useState } from "react";
import { ArrowsLeftRight } from "@phosphor-icons/react";
import { Button, type ButtonSize } from "@/components/ui/Button";
import type { Account } from "@/lib/types";
import { TransferDialog } from "./TransferDialog";

/** Abre el formulario de transferencia desde donde haga falta. */
export function TransferButton({
  accounts,
  size = "md",
}: {
  accounts: Account[];
  size?: ButtonSize;
}) {
  const [open, setOpen] = useState(false);

  if (accounts.length < 2) return null;

  return (
    <>
      <Button variant="secondary" size={size} onClick={() => setOpen(true)}>
        <ArrowsLeftRight size={15} />
        Transferir
      </Button>
      {/* Remontado en cada apertura: arranca limpio sin resetear a mano. */}
      <TransferDialog
        key={String(open)}
        open={open}
        onClose={() => setOpen(false)}
        accounts={accounts}
      />
    </>
  );
}
