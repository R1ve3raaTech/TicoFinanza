"use client";

import { useEffect } from "react";
import { ArrowClockwise } from "@phosphor-icons/react";
import { BrandMark } from "@/components/brand/BrandMark";
import { Button } from "@/components/ui/Button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-[100dvh] flex-col items-center justify-center bg-ground px-6 text-center">
      <BrandMark size={28} className="mb-6 text-ink-3" />
      <p role="alert" className="text-heading text-ink">
        Hubo un error.
      </p>
      <p className="mt-1 text-sm text-ink-3">Volvé a intentarlo.</p>
      <Button variant="primary" className="mt-6" onClick={() => reset()}>
        <ArrowClockwise size={15} />
        Reintentar
      </Button>
    </main>
  );
}
