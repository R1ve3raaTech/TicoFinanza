"use client";

import { useEffect, useState } from "react";
import { ArrowSquareOut, FilePdf } from "@phosphor-icons/react";
import { getReceiptUrl } from "@/app/dashboard/actions";
import { Button, buttonClass } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { FormError } from "@/components/ui/Field";
import { isPdfReceipt } from "@/lib/receipts";
import { GENERIC_ERROR } from "@/lib/errors";

/**
 * Visor del comprobante de un movimiento.
 *
 * La URL no se guarda en ningún lado: el bucket es privado, así que se pide
 * una URL firmada cada vez que se abre el visor y se descarta al cerrarlo.
 * Así un link copiado del inspector deja de servir en diez minutos.
 */
export function ReceiptViewer({
  path,
  onClose,
  title = "Comprobante",
}: {
  /** Ruta en el bucket, o null para no mostrar nada. */
  path: string | null;
  onClose: () => void;
  title?: string;
}) {
  // El resultado se guarda junto con la ruta que lo pidió, en vez de
  // limpiarse al cambiar de comprobante: así el efecto no tiene que llamar a
  // setState de entrada (lo que provoca un render en cascada) y nunca se ve
  // la foto del movimiento anterior mientras carga la nueva.
  const [result, setResult] = useState<{
    path: string;
    url: string | null;
    error: string | null;
  } | null>(null);

  useEffect(() => {
    if (!path) return;
    let cancelled = false;
    getReceiptUrl(path).then((response) => {
      if (cancelled) return;
      setResult({
        path,
        url: response.url,
        error: response.url ? null : (response.error ?? GENERIC_ERROR),
      });
    });
    return () => {
      cancelled = true;
    };
  }, [path]);

  const current = result?.path === path ? result : null;
  const url = current?.url ?? null;
  const error = current?.error ?? null;

  const pdf = path ? isPdfReceipt(path) : false;

  return (
    <Dialog
      open={Boolean(path)}
      onClose={onClose}
      size="lg"
      title={title}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cerrar
          </Button>
          {url && (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonClass({ variant: "primary", size: "md" })}
            >
              <ArrowSquareOut size={15} />
              Abrir
            </a>
          )}
        </>
      }
    >
      <div className="flex min-h-[200px] items-center justify-center">
        {error ? (
          <FormError>{error}</FormError>
        ) : !url ? (
          <p className="text-meta text-ink-3">Cargando…</p>
        ) : pdf ? (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <FilePdf size={40} aria-hidden className="text-ink-3" />
            <p className="max-w-[36ch] text-sm text-ink-2">
              El comprobante es un PDF. Se abre en una pestaña nueva.
            </p>
          </div>
        ) : (
          // Sin next/image: la URL es firmada y de corta vida, así que no
          // tiene sentido que el optimizador la cachee ni la reescriba.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={url}
            alt="Comprobante del movimiento"
            className="max-h-[70vh] w-auto rounded-control border border-line object-contain"
          />
        )}
      </div>
    </Dialog>
  );
}
