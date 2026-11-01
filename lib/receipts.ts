/**
 * Comprobantes: fotos de recibos y capturas de SINPE Móvil adjuntas a un
 * movimiento.
 *
 * El archivo vive en el bucket privado `receipts` y lo que se guarda en
 * `transactions.receipt_url` es la ruta, no una URL: el bucket es privado
 * (un comprobante trae nombre, monto y a veces número de cuenta) y cada
 * vista se sirve con una URL firmada de corta vida.
 */

export const RECEIPTS_BUCKET = "receipts";

/** Lo mismo que acepta el bucket en la migración 0021. */
export const RECEIPT_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "application/pdf",
] as const;

/** Lo que se le pasa a <input type="file" accept>. */
export const RECEIPT_ACCEPT = "image/*,application/pdf";

/** 5 MB, igual que el `file_size_limit` del bucket. */
export const RECEIPT_MAX_BYTES = 5 * 1024 * 1024;

const EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
  "application/pdf": "pdf",
};

export function isAllowedReceiptType(mime: string): boolean {
  return mime in EXTENSIONS;
}

/**
 * Ruta del archivo dentro del bucket. La primera carpeta es el id del
 * usuario y de eso depende toda la seguridad: la política de storage solo
 * mira ese primer segmento, así que la ruta no puede armarse de otra forma.
 *
 * El nombre no sale del archivo original a propósito: un nombre de archivo
 * de teléfono puede traer barras, acentos o el nombre de la persona.
 */
export function receiptPath(userId: string, mime: string, id: string): string {
  const extension = EXTENSIONS[mime] ?? "bin";
  return `${userId}/${id}.${extension}`;
}

export function isPdfReceipt(path: string): boolean {
  return path.toLowerCase().endsWith(".pdf");
}

/** Mensaje de error, o null si el archivo sirve. */
export function validateReceiptFile(file: { type: string; size: number }): string | null {
  if (!isAllowedReceiptType(file.type)) {
    return "El comprobante tiene que ser una imagen (JPG, PNG, WEBP) o un PDF.";
  }
  if (file.size > RECEIPT_MAX_BYTES) {
    return "El comprobante no puede pesar más de 5 MB.";
  }
  return null;
}

/**
 * Comprueba que una ruta de comprobante sea de este usuario, antes de pedir
 * una URL firmada o de borrarla. La política de storage ya lo impide, pero
 * la app no debería ni intentarlo: `..` en la ruta o la carpeta de otra
 * persona se cortan acá.
 */
export function ownsReceiptPath(path: string, userId: string): boolean {
  if (!path || path.includes("..")) return false;
  return path.split("/")[0] === userId;
}
