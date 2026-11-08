import { createClient } from "./supabase/client";
import {
  RECEIPTS_BUCKET,
  receiptPath,
  validateReceiptFile,
} from "./receipts";
import { GENERIC_ERROR } from "@/lib/errors";

/**
 * Subida de comprobantes desde el navegador, directo a Supabase Storage.
 *
 * No pasa por una Server Action a propósito: una action tiene un tope de 1 MB
 * de cuerpo y la foto de un recibo lo pasa sin esfuerzo. El navegador sube
 * con la sesión del usuario, así que la política de storage (migración 0021)
 * es la que decide si puede escribir en esa carpeta.
 */

/** Lado más largo al que se reduce una foto antes de subirla. */
const MAX_EDGE = 1600;
const JPEG_QUALITY = 0.82;

/**
 * Reduce una foto de teléfono a algo razonable. Una cámara de 12 MP da
 * archivos de 4-8 MB para una imagen que se va a mirar en una pantalla de
 * 400px de ancho: pasa del tope del bucket y se tarda en subir con datos
 * móviles.
 *
 * Si algo falla (un HEIC que el navegador no sabe decodificar, por ejemplo)
 * devuelve el archivo original: subir la foto grande es mejor que no subir
 * nada.
 */
async function shrinkImage(file: File): Promise<{ blob: Blob; type: string }> {
  if (!file.type.startsWith("image/") || typeof createImageBitmap !== "function") {
    return { blob: file, type: file.type };
  }

  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) return { blob: file, type: file.type };
    context.drawImage(bitmap, 0, 0, width, height);
    bitmap.close?.();

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY)
    );
    if (!blob) return { blob: file, type: file.type };
    // Si comprimir no ganó nada (una captura de pantalla pequeña ya en PNG),
    // se queda el original.
    if (blob.size >= file.size) return { blob: file, type: file.type };
    return { blob, type: "image/jpeg" };
  } catch {
    return { blob: file, type: file.type };
  }
}

export interface UploadResult {
  path: string | null;
  error: string | null;
}

export async function uploadReceipt(file: File): Promise<UploadResult> {
  const invalid = validateReceiptFile(file);
  if (invalid) return { path: null, error: invalid };

  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const userId = session?.user?.id;
  if (!userId) return { path: null, error: "Volvé a entrar para subir el comprobante." };

  const { blob, type } = await shrinkImage(file);
  // El tope del bucket se revisa otra vez contra lo que de verdad se sube:
  // una foto que entraba por los pelos y no se pudo comprimir se rechaza acá
  // en vez de morir con un error de storage sin explicación.
  const invalidAfter = validateReceiptFile({ type, size: blob.size });
  if (invalidAfter) return { path: null, error: invalidAfter };

  const path = receiptPath(userId, type, crypto.randomUUID());
  const { error } = await supabase.storage.from(RECEIPTS_BUCKET).upload(path, blob, {
    contentType: type,
    upsert: false,
  });

  if (error) return { path: null, error: GENERIC_ERROR };
  return { path, error: null };
}

/**
 * Borra un archivo que se subió y al final no se guardó (el usuario cerró el
 * formulario o lo reemplazó). Sin esto el bucket junta fotos que ningún
 * movimiento referencia.
 */
export async function deleteReceiptFile(path: string): Promise<void> {
  const supabase = createClient();
  await supabase.storage.from(RECEIPTS_BUCKET).remove([path]);
}
