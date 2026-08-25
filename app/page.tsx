import { AnchorLink } from "@/components/landing/AnchorLink";
import { DashboardPreview } from "@/components/landing/DashboardPreview";
import { Faq } from "@/components/landing/Faq";
import { Features } from "@/components/landing/Features";
import { Footer } from "@/components/landing/Footer";
import { Hero } from "@/components/landing/Hero";
import { LoginButton } from "@/components/landing/LoginButton";
import { PasswordTrust } from "@/components/landing/PasswordTrust";
import { Pricing } from "@/components/landing/Pricing";
import { PrivacySnippet } from "@/components/landing/PrivacySnippet";
import { Reveal } from "@/components/landing/Reveal";
import { StepsSection } from "@/components/landing/StepsSection";
import { SupportedBanks } from "@/components/landing/SupportedBanks";
import { Logo } from "@/components/Logo";
import { BANK_BRAND } from "@/lib/bankBrand";
import { createClient } from "@/lib/supabase/server";
import type { BankName } from "@/lib/types";

// Solo los bancos con parser implementado y funcionando (ver
// lib/parsers/index.ts) — nada de prometer entidades que todavía no leemos.
const supportedBanks: BankName[] = ["BAC", "BCR", "BNCR", "BP", "Davivienda", "MUCAP", "PayPal"];

const navLinks = [
  { label: "Cómo funciona", href: "#como-funciona" },
  { label: "Funciones", href: "#funciones" },
  { label: "Precio", href: "#precio" },
  { label: "Preguntas", href: "#preguntas" },
];

const steps = [
  {
    title: "Conectá tu correo",
    body: "Iniciá sesión con Google y autorizá la lectura de tus correos bancarios. Solo lectura, nada más.",
  },
  {
    title: "Categorización automática",
    body: "Cada notificación de compra, transferencia o SINPE Móvil se convierte en una transacción, ya categorizada.",
  },
  {
    title: "Mirá tus finanzas claras",
    body: "Tu saldo consolidado en colones, siempre al día. Solo el efectivo se anota a mano.",
  },
];

// Datos estructurados para que Google entienda qué es la app sin tener que
// inferirlo del texto — no incluye aggregateRating: inventar reseñas que no
// existen viola las guías de Google y puede penalizar el sitio entero.
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "TicoFinanza",
  applicationCategory: "FinanceApplication",
  operatingSystem: "Web, Android, iOS",
  url: "https://www.ticofinanza.com",
  description:
    "Lee automáticamente tus correos de BAC, BCR, Banco Nacional, Banco Popular, DaviBank, MUCAP y PayPal. Controlá tus finanzas sin mover un solo dedo. Hecho para Costa Rica.",
  offers: { "@type": "Offer", price: "0", priceCurrency: "CRC" },
  areaServed: "CR",
  inLanguage: "es-CR",
};

export default async function LandingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const loggedIn = Boolean(user);

  return (
    <main className="flex min-h-[100dvh] flex-col bg-ground">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <header className="sticky top-0 z-40 border-b border-line bg-ground/80 backdrop-blur">
        <div className="mx-auto flex h-[68px] w-full max-w-6xl items-center justify-between gap-6 px-4 sm:px-6">
          <Logo subtitle="finanzas personales" />

          {/* Solo en pantallas grandes: en móvil el header se queda con el
              logo y el botón, que es lo único que importa ahí. */}
          <nav className="hidden items-center gap-7 md:flex">
            {navLinks.map((link) => (
              <AnchorLink
                key={link.href}
                href={link.href}
                className="text-sm text-ink-2 transition-colors hover:text-ink"
              >
                {link.label}
              </AnchorLink>
            ))}
          </nav>

          <LoginButton loggedIn={loggedIn} />
        </div>
      </header>

      <Hero loggedIn={loggedIn} />

      <section className="border-t border-line">
        <div className="mx-auto w-full max-w-6xl px-4 py-14 text-center sm:px-6 sm:text-left">
          <p className="mb-6 text-sm text-ink-3">
            Compatible con las entidades que ya usás — más SINPE Móvil
          </p>
          <SupportedBanks
            banks={supportedBanks.map((bank) => ({ bank, label: BANK_BRAND[bank].label }))}
          />
          <p className="mt-8 text-xs text-ink-3">
            ¿No está el tuyo? Podés anotar tus movimientos a mano y usar todo lo demás igual —{" "}
            <a
              href="mailto:info@ticofinanza.com?subject=Sumen%20mi%20banco"
              className="text-accent underline-offset-4 transition-colors hover:text-accent-soft hover:underline"
            >
              contanos cuál es
            </a>{" "}
            y lo evaluamos.
          </p>
        </div>
      </section>

      <section id="como-funciona" className="scroll-mt-[68px] border-t border-line">
        <div className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6">
          <StepsSection heading="De un correo del banco a un gasto ordenado" steps={steps} />
        </div>
      </section>

      <section className="border-t border-line">
        <div className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6">
          <DashboardPreview />
        </div>
      </section>

      <section id="funciones" className="scroll-mt-[68px] border-t border-line">
        <div className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6">
          <Features />
        </div>
      </section>

      <section id="seguridad" className="scroll-mt-[68px] border-t border-line">
        <div className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6">
          <PasswordTrust />
        </div>
      </section>

      <section id="precio" className="scroll-mt-[68px] border-t border-line">
        <div className="mx-auto w-full max-w-6xl px-4 py-24 sm:px-6">
          <Pricing loggedIn={loggedIn} />
        </div>
      </section>

      <section id="preguntas" className="scroll-mt-[68px] border-t border-line">
        <div className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6">
          <Faq />
        </div>
      </section>

      <section className="border-t border-line">
        <div className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6">
          <PrivacySnippet />
        </div>
      </section>

      <section className="border-t border-line">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-6 px-4 py-24 text-center sm:px-6">
          <Reveal className="flex flex-col items-center gap-6">
            <h2 className="max-w-[28ch] font-montserrat text-3xl font-bold leading-[1.05] tracking-tighter text-ink sm:text-4xl">
              ¿Listo para dejar de anotar gastos a mano?
            </h2>
            <LoginButton large loggedIn={loggedIn} />
            <p className="text-xs text-ink-3">
              Toma menos de un minuto. Podés desconectar tu correo cuando querás.
            </p>
          </Reveal>
        </div>
      </section>

      <Footer loggedIn={loggedIn} />
    </main>
  );
}
