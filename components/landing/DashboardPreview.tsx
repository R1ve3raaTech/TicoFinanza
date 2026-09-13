import Image from "next/image";
import { Reveal, SectionHeading } from "./Reveal";

/**
 * Captura real del dashboard (con datos de ejemplo, no de un usuario real —
 * ver el punto de la landing en CLAUDE.md). Reemplaza la promesa en texto de
 * "mirá tus finanzas claras" por el producto tal cual se ve, en vez de un
 * mockup de tarjetas sueltas como el del Hero.
 */
export function DashboardPreview() {
  return (
    <>
      <SectionHeading
        centered
        label="Así se ve"
        title="Tu dinero, ordenado solo"
        body="Saldo, movimientos categorizados y los últimos 6 meses, en una sola pantalla."
      />

      <Reveal delay={0.1} className="mt-12">
        <div className="overflow-hidden rounded-dialog border border-line-strong bg-surface shadow-[0_30px_80px_-24px_rgba(0,0,0,0.45)]">
          <Image
            src="/screenshots/dashboard.png"
            alt="Dashboard de TicoFinanza con el saldo consolidado, las últimas transacciones categorizadas y el gráfico de ingresos y gastos de los últimos 6 meses"
            width={1440}
            height={1090}
            sizes="(min-width: 1152px) 1152px, 100vw"
            className="w-full"
          />
        </div>
      </Reveal>
    </>
  );
}
