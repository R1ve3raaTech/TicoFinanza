import Link from "next/link";
import { ArrowRight, Check, X } from "@phosphor-icons/react/dist/ssr";

const CLAIMS = [
  {
    icon: Check,
    tone: "text-income",
    text: "Entrás con Google y solo recibimos tu nombre, tu correo y tu foto de perfil.",
  },
  {
    icon: X,
    tone: "text-ink-3",
    text: "No pedimos acceso a tus correos. La app no lee tu Gmail ni ningún otro buzón.",
  },
  {
    icon: X,
    tone: "text-ink-3",
    text: "No nos conectamos a tu banco ni te pedimos usuario o clave de la banca en línea.",
  },
];

/**
 * Seguridad y privacidad. Lo que la app NO hace es más importante que lo que
 * hace: una app de plata que pide acceso al correo o al banco arranca con
 * desconfianza, y esta no pide ninguno de los dos.
 */
export function Security() {
  return (
    <div className="flex flex-col gap-8">
        <div className="divide-y divide-line rounded-surface border border-line">
          {CLAIMS.map((claim) => (
            <div key={claim.text} className="flex items-start gap-3 p-4">
              <claim.icon
                size={16}
                weight="bold"
                aria-hidden
                className={`mt-0.5 shrink-0 ${claim.tone}`}
              />
              <p className={`text-sm ${claim.tone === "text-income" ? "text-ink" : "text-ink-3"}`}>
                {claim.text}
              </p>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-medium text-ink">Control sobre tu información</h3>
          <p className="text-sm leading-relaxed text-ink-2">
            Tus movimientos y tus gastos fijos son tuyos: podés borrarlos, o eliminar la cuenta
            entera, desde los ajustes y sin escribirle a nadie. La política de privacidad explica
            qué se guarda y qué servicios usa la app, según la Ley 8968 de Protección de la Persona
            frente al tratamiento de sus datos personales.
          </p>
          <Link
            href="/privacidad"
            className="mt-1 inline-flex w-fit items-center gap-1.5 text-sm font-medium text-accent transition-colors hover:text-accent-soft"
          >
            Leer la política de privacidad completa
            <ArrowRight size={14} weight="bold" />
          </Link>
        </div>
    </div>
  );
}
