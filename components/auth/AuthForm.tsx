"use client";

import Link from "next/link";
import { Info, LockKey, ShieldCheck } from "@phosphor-icons/react";
import { GoogleMark } from "@/components/GoogleMark";
import { signInWithGoogle } from "@/lib/supabase/client";

export function AuthForm() {
  return (
    <div className="flex w-full flex-col gap-6">
      <div className="text-center">
        <h1 className="text-[1.625rem] font-semibold leading-tight tracking-[-0.025em] text-ink">
          Entrá a tu cuenta
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-2">
          Con tu cuenta de Google activás la lectura automática de tus correos bancarios.
        </p>
      </div>

      <button
        type="button"
        onClick={() => signInWithGoogle()}
        className="inline-flex h-11 w-full items-center justify-center gap-3 rounded-control border border-line-strong bg-surface text-[0.9375rem] font-medium text-ink transition-colors duration-150 cursor-pointer hover:bg-surface-hover"
      >
        <GoogleMark size={18} />
        Continuar con Google
      </button>

      <ul className="flex flex-col gap-2 text-meta text-ink-3">
        <li className="flex items-start gap-2">
          <ShieldCheck size={14} aria-hidden className="mt-px shrink-0 text-ink-2" />
          Gratis, sin tarjeta. Si es tu primera vez, la cuenta se crea sola.
        </li>
        <li className="flex items-start gap-2">
          <LockKey size={14} aria-hidden className="mt-px shrink-0 text-ink-2" />
          Solo lectura de tus correos. Nunca pedimos la clave de tu banco.
        </li>
      </ul>

      {/* Google le muestra "app no verificada" a las cuentas nuevas mientras
          dura la revisión del permiso de Gmail. Avisarlo acá, justo antes del
          clic, es la diferencia entre que la persona siga adelante o piense
          que la app es trucha y se vaya. Esconderlo no lo hace desaparecer:
          lo ve igual, pero sin contexto. */}
      <div className="flex gap-2.5 border-t border-line pt-4">
        <Info size={15} aria-hidden className="mt-0.5 shrink-0 text-ink-3" />
        <p className="text-meta leading-relaxed text-ink-3">
          Google te va a mostrar un aviso de{" "}
          <span className="text-ink-2">&ldquo;app no verificada&rdquo;</span>. Es porque leer
          Gmail requiere una revisión de seguridad que TicoFinanza está haciendo ahora mismo.
          Podés continuar, y quitarle el acceso cuando querás desde tu cuenta de Google.{" "}
          <Link
            href="/#preguntas"
            className="text-accent underline-offset-4 hover:underline"
          >
            Más detalles
          </Link>
        </p>
      </div>
    </div>
  );
}
