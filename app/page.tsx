import type { ReactNode } from "react";
import { DashboardPreview } from "@/components/landing/DashboardPreview";
import { Faq } from "@/components/landing/Faq";
import { Features } from "@/components/landing/Features";
import { Footer } from "@/components/landing/Footer";
import { Hero } from "@/components/landing/Hero";
import { LandingSpine, SectionLabel, type SpineSection } from "@/components/landing/LandingSpine";
import { LoginButton } from "@/components/landing/LoginButton";
import { Pricing } from "@/components/landing/Pricing";
import { Security } from "@/components/landing/Security";
import { Steps } from "@/components/landing/Steps";
import { Logo } from "@/components/Logo";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseConfig } from "@/lib/supabase/config";

/**
 * Las secciones viven en una sola lista: la espina de la izquierda y el
 * cuerpo leen de acá, así que no pueden desincronizarse.
 */
const SECTIONS: SpineSection[] = [
  { id: "como-funciona", label: "Cómo funciona" },
  { id: "la-app", label: "Así se ve" },
  { id: "funciones", label: "Qué obtenés" },
  { id: "seguridad", label: "Seguridad" },
  { id: "precio", label: "Precio" },
  { id: "preguntas", label: "Preguntas" },
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

/**
 * Una sección del cuerpo.
 *
 * `measure` es la decisión de diseño que ordena la página: antes todas las
 * secciones medían lo mismo y la página entera se leía como una sola columna
 * indiferenciada. Acá cada una mide lo que su contenido necesita —las
 * preguntas a ancho de lectura, la captura a todo lo ancho— y esa diferencia
 * es la que marca el ritmo, en vez de repetir una línea divisoria.
 */
function Section({
  id,
  label,
  title,
  lead,
  measure = "full",
  air = "normal",
  children,
}: {
  id: string;
  label: string;
  title: string;
  lead?: string;
  measure?: "full" | "reading" | "narrow";
  /** La captura del producto respira más que un bloque de texto. */
  air?: "normal" | "wide";
  children: ReactNode;
}) {
  const width =
    measure === "reading" ? "max-w-[68ch]" : measure === "narrow" ? "max-w-[52ch]" : "";

  return (
    <section
      id={id}
      aria-labelledby={`${id}-titulo`}
      className={`scroll-mt-24 ${air === "wide" ? "py-16 md:py-28" : "py-14 md:py-20"}`}
    >
      <SectionLabel>{label}</SectionLabel>
      <div className={width}>
        {/* Sin rótulo en mayúsculas encima del título: el nombre de la
            sección ya está en la espina, donde además sirve para navegar. */}
        <h2
          id={`${id}-titulo`}
          className="max-w-[24ch] text-balance text-2xl font-semibold leading-[1.15] tracking-[-0.02em] text-ink md:text-[2rem]"
        >
          {title}
        </h2>
        {lead && (
          <p className="mt-3 max-w-[56ch] text-sm leading-relaxed text-ink-2 sm:text-base">
            {lead}
          </p>
        )}
      </div>
      <div className={`mt-9 ${width}`}>{children}</div>
    </section>
  );
}

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

      {/* Misma altura (64px) que el rail de la app. El encabezado ya no lleva
          los enlaces de sección: esa navegación es la espina, que además
          dice dónde estás y existe en todos los tamaños. */}
      <header className="sticky top-0 z-40 border-b border-line bg-ground/80 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-6 px-4 sm:px-6">
          <Logo subtitle="finanzas personales" />
          <LoginButton loggedIn={loggedIn} />
        </div>
      </header>

      <Hero loggedIn={loggedIn} />

      <div className="border-t border-line">
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
          <div className="lg:grid lg:grid-cols-[150px_minmax(0,1fr)] lg:gap-16 xl:gap-24">
            <div className="relative">
              <LandingSpine sections={SECTIONS} />
            </div>

            {/* Sin líneas entre secciones: una banda tras otra separada por
                la misma raya es justo lo que hacía que la página se leyera
                como una sola columna indiferenciada. El ritmo lo dan la
                espina, el aire y el ancho distinto de cada sección. */}
            <div className="min-w-0">
              <Section
                id="como-funciona"
                label="Cómo funciona"
                title="Tres pasos, sin conectar nada"
                lead="No hay sincronización que configurar ni permisos que autorizar: la app trabaja con lo que vos anotás."
              >
                <Steps />
              </Section>

              <Section
                id="la-app"
                air="wide"
                label="Así se ve"
                title="Todo el mes en una pantalla"
                lead="El resumen del mes, lo que vence primero, el calendario de cobros y en qué se te va la plata."
              >
                <DashboardPreview />
              </Section>

              <Section
                id="funciones"
                label="Qué obtenés"
                title="Una hoja de cálculo que sí vas a usar"
                lead="Lo mismo que anotarías en Excel, pero con las cuentas hechas, los vencimientos al frente y en el teléfono."
              >
                <Features />
              </Section>

              <Section
                id="seguridad"
                label="Seguridad"
                title="La app no toca tu banco ni tu correo"
                lead="TicoFinanza funciona con lo que vos anotás. No hay sincronización bancaria, no hay lectura de correos y no hay nada que revocar después."
                measure="reading"
              >
                <Security />
              </Section>

              <Section
                id="precio"
                label="Precio"
                title="Gratis, y sin letra chiquita"
                lead="Es un proyecto hecho en Costa Rica para resolver un problema que el que lo hizo también tenía."
                measure="reading"
              >
                <Pricing />
              </Section>

              <Section
                id="preguntas"
                label="Preguntas"
                title="Lo que todos preguntan antes de entrar"
                lead="Si algo no queda claro, escribinos a info@ticofinanza.com y te contestamos."
                measure="reading"
              >
                <Faq />
              </Section>
            </div>
          </div>
        </div>
      </div>

      {/* El único bloque centrado de la página, y el último: después de una
          lectura entera alineada a la izquierda, centrar funciona como punto
          final. */}
      <section className="border-t border-line">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-6 px-4 py-20 text-center sm:px-6">
          <h2 className="max-w-[24ch] text-balance text-2xl font-semibold leading-[1.15] tracking-[-0.02em] text-ink sm:text-3xl">
            ¿Listo para saber en qué se te va la plata?
          </h2>
          <LoginButton large loggedIn={loggedIn} />
          <p className="text-xs text-ink-3">
            Gratis, en colones, y sin conectar tu banco ni tu correo.
          </p>
        </div>
      </section>

      <Footer loggedIn={loggedIn} />
    </main>
  );
}
