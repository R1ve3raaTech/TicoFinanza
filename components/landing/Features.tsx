import {
  ArrowsClockwise,
  BellRinging,
  ChartPieSlice,
  Coins,
  DeviceMobile,
  DownloadSimple,
  EnvelopeSimple,
  Sparkle,
  Target,
} from "@phosphor-icons/react/dist/ssr";
import type { Icon } from "@phosphor-icons/react";
import { Reveal, SectionHeading } from "./Reveal";

interface FeatureItem {
  icon: Icon;
  title: string;
  body: string;
}

/**
 * Solo funciones que ya existen y andan en producción — nada de "próximamente".
 * Si se agrega una acá, tiene que estar realmente implementada.
 *
 * Agrupadas por lo que resuelven (no una parrilla de 8 tarjetas idénticas):
 * mismo principio de fila "etiqueta | contenido" que usa Ajustes en la app.
 */
const groups: { label: string; items: FeatureItem[] }[] = [
  {
    label: "Automatización",
    items: [
      {
        icon: Sparkle,
        title: "Categorización con IA",
        body: "Cada movimiento llega con su categoría puesta. Si no le achuntó, la cambiás de un toque.",
      },
      {
        icon: ArrowsClockwise,
        title: "Suscripciones detectadas",
        body: "Encuentra los cobros que se repiten todos los meses, aunque nunca los anotaras.",
      },
      {
        icon: EnvelopeSimple,
        title: "Varios correos a la vez",
        body: "¿Tenés el banco en un Gmail y las compras en otro? Conectá los que necesités.",
      },
    ],
  },
  {
    label: "Control",
    items: [
      {
        icon: Target,
        title: "Presupuestos y metas",
        body: "Poné un tope por categoría y una meta de ahorro. El avance se calcula solo.",
      },
      {
        icon: BellRinging,
        title: "Avisos al pasarte",
        body: "Notificación en el teléfono cuando un gasto te saca del presupuesto del mes.",
      },
    ],
  },
  {
    label: "Análisis",
    items: [
      {
        icon: ChartPieSlice,
        title: "Estadísticas del mes",
        body: "En qué se te va la plata, por categoría y por comercio, mes contra mes.",
      },
    ],
  },
  {
    label: "Tus datos",
    items: [
      {
        icon: Coins,
        title: "Todo en colones",
        body: "Un gasto en dólares, euros o córdobas se convierte solo, con el tipo de cambio del día.",
      },
      {
        icon: DownloadSimple,
        title: "Tus datos son tuyos",
        body: "Exportá todo a CSV cuando querás, o borrá la cuenta entera sin escribirle a nadie.",
      },
    ],
  },
];

function FeatureGroup({
  label,
  items,
  delay,
}: {
  label: string;
  items: FeatureItem[];
  delay: number;
}) {
  return (
    <Reveal
      delay={delay}
      className="grid gap-4 border-t border-line py-7 first:border-t-0 first:pt-0 md:grid-cols-[160px_minmax(0,1fr)] md:gap-8"
    >
      <h3 className="text-sm font-medium text-ink-2">{label}</h3>
      <div
        className={`grid gap-x-6 gap-y-5 ${items.length >= 2 ? "sm:grid-cols-2" : ""} ${
          items.length >= 3 ? "lg:grid-cols-3" : ""
        }`}
      >
        {items.map((item) => (
          <div key={item.title} className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
              <item.icon size={16} weight="bold" className="shrink-0 text-ink-2" />
              <h4 className="text-sm font-medium text-ink">{item.title}</h4>
            </div>
            <p className="text-sm leading-relaxed text-ink-3">{item.body}</p>
          </div>
        ))}
      </div>
    </Reveal>
  );
}

export function Features() {
  return (
    <>
      <SectionHeading
        label="Qué obtenés"
        title="Todo lo que hace TicoFinanza por vos"
        body="No es solo una lista de gastos: es lo que harías vos en una hoja de cálculo, pero hecho solo y todos los días."
      />

      <div className="mt-8">
        {groups.map((group, i) => (
          <FeatureGroup key={group.label} label={group.label} items={group.items} delay={Math.min(i, 3) * 0.05} />
        ))}
      </div>

      <Reveal delay={0.1}>
        <p className="mt-8 flex items-center justify-center gap-2 text-xs text-ink-3">
          <DeviceMobile size={14} weight="bold" className="text-ink-3" />
          Se instala en el teléfono como una app, desde el mismo navegador.
        </p>
      </Reveal>
    </>
  );
}
