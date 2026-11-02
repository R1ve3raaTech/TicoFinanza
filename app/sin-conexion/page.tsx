import type { Metadata } from "next";
import Link from "next/link";
import { CloudSlash } from "@phosphor-icons/react/dist/ssr";
import { Logo } from "@/components/Logo";

export const metadata: Metadata = { title: "Sin conexión" };

/**
 * Lo último que queda cuando no hay señal y tampoco hay nada guardado de
 * esa pantalla.
 *
 * El Service Worker la guarda al instalarse, así que existe aunque no haya
 * red. Es estática a propósito: si pidiera cualquier dato, no podría
 * mostrarse justo cuando se la necesita.
 */
export default function OfflinePage() {
  return (
    <main
      id="contenido"
      className="flex min-h-[100dvh] flex-col items-center justify-center bg-ground px-6 text-center text-ink"
    >
      <Logo />
      <CloudSlash size={28} aria-hidden className="mt-10 text-ink-3" />
      <h1 className="mt-4 text-2xl font-semibold tracking-tight">Sin conexión</h1>
      <p className="mt-3 max-w-[46ch] text-sm leading-relaxed text-ink-2">
        No pudimos cargar esta pantalla y no hay una copia guardada en este dispositivo. Las
        pantallas que ya habías abierto con señal sí se pueden ver.
      </p>
      <p className="mt-6 max-w-[46ch] text-meta leading-relaxed text-ink-3">
        Lo que anotes sin señal queda guardado acá y se manda solo en cuanto vuelva.
      </p>
      <Link
        href="/dashboard"
        className="mt-8 text-sm text-accent underline-offset-4 hover:underline"
      >
        Volver al resumen
      </Link>
    </main>
  );
}
