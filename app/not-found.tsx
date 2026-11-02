import type { Metadata } from "next";
import Link from "next/link";
import { BrandMark } from "@/components/brand/BrandMark";
import { buttonClass } from "@/components/ui/Button";

export const metadata: Metadata = { title: "Página no encontrada" };

/**
 * 404 propio.
 *
 * Sin este archivo, Next sirve su pantalla de fábrica: fondo blanco incluso
 * con la app en oscuro, tipografía del sistema y un "404 | This page could
 * not be found" en inglés. Quien llega ahí desde un enlace viejo no sabe si
 * se equivocó de dirección o si la app se rompió.
 *
 * Las dos salidas son a propósito: al resumen para quien ya entró, y a la
 * portada para quien no. Mandar a todo el mundo a /dashboard dejaría a los
 * que no tienen sesión rebotando al login sin entender por qué.
 */
export default function NotFound() {
  return (
    <main
      id="contenido"
      className="flex min-h-[100dvh] flex-col items-center justify-center bg-ground px-6 text-center text-ink"
    >
      <BrandMark size={28} className="text-ink-3" />

      <p className="money mt-8 text-meta text-ink-3">Error 404</p>
      <h1 className="mt-1 text-2xl font-semibold tracking-tight">Esta página no existe</h1>
      <p className="mt-3 max-w-[44ch] text-sm leading-relaxed text-ink-2">
        El enlace puede estar viejo o tener algo mal escrito. Tus datos están donde los dejaste.
      </p>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link href="/dashboard" className={buttonClass({ variant: "primary" })}>
          Ir al resumen
        </Link>
        <Link href="/" className={buttonClass({ variant: "secondary" })}>
          Volver al inicio
        </Link>
      </div>
    </main>
  );
}
