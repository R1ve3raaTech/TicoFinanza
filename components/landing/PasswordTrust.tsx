import Link from "next/link";
import { ArrowRight, Check, X } from "@phosphor-icons/react/dist/ssr";
import { Reveal, SectionHeading } from "./Reveal";

/**
 * Sección de seguridad y privacidad. Antes eran dos secciones separadas
 * (PasswordTrust + PrivacySnippet) que decían cosas relacionadas —"solo
 * lectura de Gmail" y "protegidos por la Ley 8968"— a un scroll de
 * distancia. Una sola sección con las dos ideas es más clara (no dos ecos
 * del mismo mensaje de confianza) y más corta.
 */
export function PasswordTrust() {
  return (
    <>
      <SectionHeading
        label="Seguridad"
        title="Nunca te pedimos la clave de tu banca en línea"
        body="Solo pedimos permiso de lectura sobre tu Gmail — el mismo tipo de acceso que le darías a cualquier casillero de correo. Podés revocarlo cuando quieras desde tu cuenta de Google, sin escribirnos."
      />

      <Reveal delay={0.1} className="mt-10 grid gap-8 md:grid-cols-2 md:gap-12">
        <div className="divide-y divide-line rounded-surface border border-line">
          <div className="flex items-start gap-3 p-4">
            <Check size={16} weight="bold" className="mt-0.5 shrink-0 text-income" />
            <p className="text-sm text-ink">
              Leemos las notificaciones que tu banco ya te manda por correo.
            </p>
          </div>
          <div className="flex items-start gap-3 p-4">
            <X size={16} weight="bold" className="mt-0.5 shrink-0 text-ink-3" />
            <p className="text-sm text-ink-3">
              Nunca te pedimos usuario ni clave de tu banca en línea.
            </p>
          </div>
        </div>

        <div className="flex flex-col justify-center gap-2">
          <h3 className="text-sm font-medium text-ink">
            Tus datos, protegidos según la Ley 8968
          </h3>
          <p className="text-sm leading-relaxed text-ink-2">
            Cumplimos la Ley de Protección de la Persona frente al Tratamiento de sus Datos
            Personales de Costa Rica: sabés exactamente qué leemos, podés pedir que borremos todo
            cuando quieras, y nunca vendemos tu información a terceros.
          </p>
          <Link
            href="/privacidad"
            className="mt-1 inline-flex w-fit items-center gap-1.5 text-sm font-medium text-accent transition-colors hover:text-accent-soft"
          >
            Leer la política de privacidad completa
            <ArrowRight size={14} weight="bold" />
          </Link>
        </div>
      </Reveal>
    </>
  );
}
