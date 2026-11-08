"use client";

import { useEffect } from "react";
import { ArrowClockwise } from "@phosphor-icons/react";
import { BrandMark } from "@/components/brand/BrandMark";
import { Button } from "@/components/ui/Button";
import { GENERIC_ERROR_HELP, GENERIC_ERROR_TITLE } from "@/lib/errors";

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
        {GENERIC_ERROR_TITLE}
      </p>
      <p className="mt-1 max-w-[46ch] text-sm leading-relaxed text-ink-3">
        {GENERIC_ERROR_HELP}
      </p>
      <Button variant="primary" className="mt-6" onClick={() => reset()}>
        <ArrowClockwise size={15} />
        Reintentar
      </Button>
    </main>
  );
}
