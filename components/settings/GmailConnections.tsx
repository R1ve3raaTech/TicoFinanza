"use client";

import { useTransition } from "react";
import { EnvelopeSimple, Plus } from "@phosphor-icons/react";
import { disconnectGmail } from "@/app/dashboard/settings/actions";
import { useToast } from "@/components/Toast";
import { Button, buttonClass } from "@/components/ui/Button";

export interface GmailConnection {
  id: string;
  email: string | null;
  last_synced_at: string | null;
}

function formatLastSync(iso: string | null): string {
  if (!iso) return "Todavía no sincronizó";
  return `Última lectura: ${new Intl.DateTimeFormat("es-CR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Costa_Rica",
  }).format(new Date(iso))}`;
}

export function GmailConnections({ connections }: { connections: GmailConnection[] }) {
  const toast = useToast();
  const [pending, startTransition] = useTransition();

  function disconnect(id: string, email: string | null) {
    startTransition(async () => {
      await disconnectGmail(id);
      toast.success(`${email ?? "Cuenta"} desconectada`);
    });
  }

  return (
    <>
      {connections.length === 0 && (
        <p className="border-b border-line py-3.5 text-sm text-ink-2">
          No hay ninguna cuenta conectada. Sin una, los movimientos no se registran solos.
        </p>
      )}

      <ul>
        {connections.map((c) => (
          <li key={c.id} className="flex items-center gap-3 border-b border-line py-3">
            <EnvelopeSimple size={18} aria-hidden className="shrink-0 text-ink-3" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm text-ink">{c.email ?? "Cuenta conectada"}</p>
              <p className="text-meta text-ink-3">{formatLastSync(c.last_synced_at)}</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => disconnect(c.id, c.email)}
              disabled={pending}
              aria-label={`Desconectar ${c.email ?? "cuenta"}`}
              className="-mr-2"
            >
              Desconectar
            </Button>
          </li>
        ))}
      </ul>

      <div className="py-3.5">
        <a href="/auth/gmail-connect" className={buttonClass({ variant: "secondary", size: "sm" })}>
          <Plus size={14} />
          {connections.length === 0 ? "Conectar Gmail" : "Conectar otra cuenta"}
        </a>
      </div>
    </>
  );
}
