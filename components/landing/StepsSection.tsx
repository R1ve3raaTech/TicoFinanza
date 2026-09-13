import { Reveal, SectionHeading } from "./Reveal";

export function StepsSection({
  heading,
  steps,
}: {
  heading: string;
  steps: { title: string; body: string }[];
}) {
  return (
    <>
      <SectionHeading
        label="Cómo funciona"
        title={heading}
        body="Tres pasos, y el único que hacés vos es el primero."
      />

      {/* Numeración editorial (mismo lenguaje que las secciones legales de
          /privacidad y /terminos: mono + ink-3, sin círculo ni ícono) sobre
          una sola línea que conecta los tres pasos como una secuencia, no
          como tarjetas sueltas. */}
      <div className="mt-10 grid gap-8 border-t border-line pt-8 md:grid-cols-3 md:gap-10">
        {steps.map((step, i) => (
          <Reveal key={step.title} delay={i * 0.08}>
            <div className="flex flex-col gap-2">
              <span className="font-mono text-xs text-ink-3">{String(i + 1).padStart(2, "0")}</span>
              <h3 className="text-base font-medium text-ink">{step.title}</h3>
              <p className="max-w-[38ch] text-sm leading-relaxed text-ink-2">{step.body}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </>
  );
}
