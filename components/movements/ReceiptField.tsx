"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, FilePdf, Paperclip, X } from "@phosphor-icons/react";
import { getReceiptUrl } from "@/app/dashboard/actions";
import { Button } from "@/components/ui/Button";
import { labelClass } from "@/components/ui/Field";
import { deleteReceiptFile, uploadReceipt } from "@/lib/receiptUpload";
import { isPdfReceipt, RECEIPT_ACCEPT } from "@/lib/receipts";

/**
 * Adjuntar la foto de un recibo o la captura de un SINPE Móvil al
 * movimiento.
 *
 * El archivo se sube en el momento de elegirlo, no al guardar el formulario:
 * así el error ("pesa demasiado", "sin internet") aparece cuando todavía se
 * puede hacer algo, y no después de darle Guardar. Lo que viaja al servidor
 * al guardar es solo la ruta.
 *
 * El input no lleva `capture`: con `accept="image/*"` el teléfono ofrece
 * cámara Y galería, que es lo que hace falta — la captura del SINPE ya está
 * guardada y forzar la cámara la volvería inalcanzable.
 */
export function ReceiptField({
  path,
  onChange,
  onError,
}: {
  path: string | null;
  /** Ruta nueva (ya subida) o null al quitarlo. */
  onChange: (path: string | null) => void;
  onError: (message: string | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  // Vista previa inmediata del archivo recién elegido, sin esperar una URL
  // firmada del servidor.
  const [localUrl, setLocalUrl] = useState<string | null>(null);
  const [remoteUrl, setRemoteUrl] = useState<string | null>(null);
  const [zoomed, setZoomed] = useState(false);

  // El comprobante que ya tenía el movimiento: hace falta pedir la URL
  // firmada para poder mostrar la miniatura.
  useEffect(() => {
    if (!path || localUrl) return;
    let cancelled = false;
    getReceiptUrl(path).then((result) => {
      if (!cancelled && result.url) setRemoteUrl(result.url);
    });
    return () => {
      cancelled = true;
    };
  }, [path, localUrl]);

  useEffect(() => {
    // Las object URL se liberan al desmontar: si no, el archivo queda en
    // memoria mientras la pestaña viva.
    return () => {
      if (localUrl) URL.revokeObjectURL(localUrl);
    };
  }, [localUrl]);

  async function pick(file: File | undefined) {
    if (!file) return;
    onError(null);
    setUploading(true);

    const previous = path;
    const result = await uploadReceipt(file);
    setUploading(false);

    if (result.error || !result.path) {
      onError(result.error);
      return;
    }

    if (localUrl) URL.revokeObjectURL(localUrl);
    setLocalUrl(file.type.startsWith("image/") ? URL.createObjectURL(file) : null);
    setRemoteUrl(null);
    onChange(result.path);

    // Reemplazar un comprobante borra el anterior en el momento: el
    // movimiento ya no lo va a referenciar.
    if (previous) await deleteReceiptFile(previous);
  }

  async function remove() {
    const current = path;
    onError(null);
    if (localUrl) URL.revokeObjectURL(localUrl);
    setLocalUrl(null);
    setRemoteUrl(null);
    onChange(null);
    if (inputRef.current) inputRef.current.value = "";
    if (current) await deleteReceiptFile(current);
  }

  const preview = localUrl ?? remoteUrl;
  const pdf = path ? isPdfReceipt(path) : false;

  return (
    <div className="flex flex-col gap-2">
      <span className={labelClass}>Comprobante</span>

      <input
        ref={inputRef}
        type="file"
        accept={RECEIPT_ACCEPT}
        className="hidden"
        onChange={(e) => pick(e.target.files?.[0])}
      />

      {path ? (
        <div className="flex items-center gap-3">
          {pdf ? (
            <span
              aria-hidden
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-control border border-line bg-surface-raised text-ink-3"
            >
              <FilePdf size={20} />
            </span>
          ) : (
            <button
              type="button"
              onClick={() => setZoomed((v) => !v)}
              aria-label={zoomed ? "Ver el comprobante más chico" : "Ver el comprobante más grande"}
              className="h-14 w-14 shrink-0 cursor-pointer overflow-hidden rounded-control border border-line bg-surface-raised"
            >
              {preview && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={preview} alt="" className="h-full w-full object-cover" />
              )}
            </button>
          )}

          <div className="flex min-w-0 flex-col items-start gap-1">
            <span className="text-meta text-ink-3">
              {pdf ? "PDF adjunto" : "Imagen adjunta"}
            </span>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="sm" onClick={() => inputRef.current?.click()} disabled={uploading}>
                {uploading ? "Subiendo…" : "Cambiar"}
              </Button>
              <Button variant="danger-ghost" size="sm" onClick={remove} disabled={uploading}>
                <X size={13} />
                Quitar
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => inputRef.current?.click()} disabled={uploading}>
            {uploading ? (
              "Subiendo…"
            ) : (
              <>
                <Camera size={14} />
                Adjuntar foto
              </>
            )}
          </Button>
          <span className="text-meta text-ink-3">
            <Paperclip size={11} aria-hidden className="mr-1 inline align-[-1px]" />
            Recibo o captura de SINPE
          </span>
        </div>
      )}

      {zoomed && preview && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={preview}
          alt="Comprobante del movimiento"
          className="max-h-[40vh] w-auto rounded-control border border-line object-contain"
        />
      )}
    </div>
  );
}
