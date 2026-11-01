import { AnchorLink } from "@/components/landing/AnchorLink";
import { DashboardPreview } from "@/components/landing/DashboardPreview";
import { Faq } from "@/components/landing/Faq";
import { Features } from "@/components/landing/Features";
import { Footer } from "@/components/landing/Footer";
import { Hero } from "@/components/landing/Hero";
import { LoginButton } from "@/components/landing/LoginButton";
import { Pricing } from "@/components/landing/Pricing";
import { Reveal } from "@/components/landing/Reveal";
import { Security } from "@/components/landing/Security";
import { Steps } from "@/components/landing/Steps";
import { Logo } from "@/components/Logo";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseConfig } from "@/lib/supabase/config";

const navLinks = [
  { label: "Cómo funciona", href: "#como-funciona" },
  { label: "Funciones", href: "#funciones" },
  { label: "Precio", href: "#precio" },
  { label: "Preguntas", href: "#preguntas" },
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
    "Registrá tus gastos fijos con su día de cobro y tus ingresos y gastos del día a día. Próximos pagos, calendario y desglose por categoría, en colones. Hecho para Costa Rica.",
  offers: { "@type": "Offer", price: "0", priceCurrency: "CRC" },
  areaServed: "CR",
  inLanguage: "es-CR",
};

export default async function LandingPage() {
  let loggedIn = false;
  if (getSupabaseConfig()) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    loggedIn = Boolean(user);
  }

  return (
    <main className="flex min-h-[100dvh] flex-col bg-ground">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {/* Misma altura (64px) que el rail de la app: la landing y la app
          comparten esa referencia aunque el header acá no sea fijo lateral. */}
      <header className="sticky top-0 z-40 border-b border-line bg-ground/80 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-6 px-4 sm:px-6">
          <Logo subtitle="finanzas personales" />

          {/* Desde lg, no md: a 768px justo no entran los 4 links + el botón
              completo sin que "Cómo funciona" se envuelva contra el logo.
              Por debajo de lg, el header se queda con el logo y el botón,
              que es lo único que importa ahí. */}
          <nav className="hidden items-center gap-7 lg:flex">
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

      <section id="como-funciona" className="scroll-mt-16 border-t border-line">
        <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6">
          <Steps />
        </div>
      </section>

      <section className="border-t border-line">
        <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6">
          <DashboardPreview />
        </div>
      </section>

      <section id="funciones" className="scroll-mt-16 border-t border-line">
        <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6">
          <Features />
        </div>
      </section>

      <section id="seguridad" className="scroll-mt-16 border-t border-line">
        <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6">
          <Security />
        </div>
      </section>

      <section id="precio" className="scroll-mt-16 border-t border-line">
        <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6">
          <Pricing />
        </div>
      </section>

      <section id="preguntas" className="scroll-mt-16 border-t border-line">
        <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6">
          <Faq />
        </div>
      </section>

      <section className="border-t border-line">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-6 px-4 py-16 text-center sm:px-6">
          <Reveal className="flex flex-col items-center gap-6">
            <h2 className="max-w-[28ch] text-balance text-2xl font-semibold leading-[1.15] tracking-[-0.02em] text-ink sm:text-3xl">
              ¿Listo para saber en qué se te va la plata?
            </h2>
            <LoginButton large loggedIn={loggedIn} />
            <p className="text-xs text-ink-3">
              Gratis, en colones, y sin conectar tu banco ni tu correo.
            </p>
          </Reveal>
        </div>
      </section>

      <Footer loggedIn={loggedIn} />
    </main>
  );
}
