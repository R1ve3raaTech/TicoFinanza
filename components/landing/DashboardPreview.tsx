import Image from "next/image";
import { Reveal, SectionHeading } from "./Reveal";

/**
 * Captura real del resumen (con datos de ejemplo, no de un usuario real).
 * Se regenera desde la preview temporal con Playwright cada vez que cambia
 * la pantalla — ver el punto de la preview en CLAUDE.md.
 */
export function DashboardPreview() {
  return (
    <>
      <SectionHeading
        centered
        label="Así se ve"
        title="Todo el mes en una pantalla"
        body="El resumen del mes, lo que vence primero, el calendario de cobros y en qué se te va la plata."
      />

      <Reveal delay={0.1} className="mt-12">
        <div className="overflow-hidden rounded-dialog border border-line-strong bg-surface shadow-[0_30px_80px_-24px_rgba(0,0,0,0.45)]">
          <Image
            src="/screenshots/dashboard.png"
            alt="Resumen de TicoFinanza con el ingreso total, los gastos fijos, los gastos variables y el superávit neto del mes, la tabla de próximos pagos, el calendario de cobros y el desglose de gastos por categoría"
            width={1440}
            height={1451}
            sizes="(min-width: 1152px) 1152px, 100vw"
            className="w-full"
          />
        </div>
      </Reveal>
    </>
  );
}
