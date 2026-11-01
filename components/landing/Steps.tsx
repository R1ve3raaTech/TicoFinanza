
/**
 * Cómo funciona, en tres pasos. Numeración editorial "01/02/03" (mismo
 * lenguaje que las secciones de /privacidad), no círculos de acento: el
 * celeste queda para CTA, foco y links.
 */
const steps = [
  {
    title: "Cargá tus gastos fijos",
    body: "Alquiler, agua, luz, internet, gimnasio, suscripciones. Cada uno con su monto y su día de cobro del mes.",
  },
  {
    title: "Anotá lo que entra y lo que sale",
    body: "El salario, lo del freelance, el súper, la gasolina. Dos toques por movimiento, con su categoría.",
  },
  {
    title: "Mirá el resumen",
    body: "Ingresos, gastos fijos, gastos variables y lo que queda. Con los próximos pagos ordenados por el que vence primero.",
  },
];

export function Steps() {
  return (
    // Es una secuencia de verdad (uno habilita al siguiente), así que acá la
    // numeración sí informa en vez de decorar.
    <ol className="grid gap-8 md:grid-cols-3 md:gap-10">
      {steps.map((step, i) => (
        <li key={step.title} className="border-t border-line-strong pt-5">
          <p className="money text-meta text-ink-3">0{i + 1}</p>
          <h3 className="mt-2 text-base font-medium text-ink">{step.title}</h3>
          <p className="mt-2 text-sm leading-relaxed text-ink-3">{step.body}</p>
        </li>
      ))}
    </ol>
  );
}
