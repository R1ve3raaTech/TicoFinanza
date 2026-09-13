"use client";

import { useTransition } from "react";
import { categorizeUncategorized } from "@/app/dashboard/actions";
import { useToast } from "@/components/Toast";
import { Button } from "@/components/ui/Button";

export function CategorizeButton({ pendingCount }: { pendingCount: number }) {
  const toast = useToast();
  const [isPending, startTransition] = useTransition();

  if (pendingCount === 0) return null;

  function run() {
    startTransition(async () => {
      const result = await categorizeUncategorized();
      if (result.error) {
        toast.error(result.error);
      } else if (result.updated === 0) {
        toast.error("No se pudo categorizar ninguna.");
      } else {
        toast.success(
          `${result.updated} transacción${result.updated === 1 ? "" : "es"} categorizada${
            result.updated === 1 ? "" : "s"
          }`
        );
      }
    });
  }

  return (
    <Button variant="ghost" size="sm" onClick={run} disabled={isPending} aria-busy={isPending}>
      {isPending ? "Categorizando..." : `Categorizar ${pendingCount} con IA`}
    </Button>
  );
}
