import {
  ArrowsLeftRight,
  CalendarCheck,
  ChartDonut,
  ChartLineUp,
  DeviceMobile,
  ListChecks,
  Moon,
  PencilSimple,
  Receipt,
  Tag,
  Target,
  Wallet,
  Trash,
} from "@phosphor-icons/react/dist/ssr";
import type { Icon } from "@phosphor-icons/react";

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
    label: "Gastos fijos",
    items: [
      {
        icon: Receipt,
        title: "Membresías y recurrentes",
        body: "Nombre, monto, categoría y día de cobro del mes. Marcás pagado y el mes siguiente vuelve a arrancar en pendiente.",
      },
      {
        icon: ListChecks,
        title: "Próximos pagos",
        body: "Ordenados por fecha, con lo que vence en menos de cinco días resaltado. Y lo vencido, marcado como vencido.",
      },
      {
        icon: CalendarCheck,
        title: "Calendario del mes",
        body: "Los días con cobros agendados marcados con un punto. Tocás el día y ves qué se cobra.",
      },
    ],
  },
  {
    label: "Cuentas",
    items: [
      {
        icon: Wallet,
        title: "Una billetera por lugar",
        body: "Efectivo, débito, crédito, ahorro. Cada movimiento sabe de dónde salió y cada cuenta lleva su saldo.",
      },
      {
        icon: ArrowsLeftRight,
        title: "Transferencias internas",
        body: "Sacar del cajero o pagar la tarjeta mueve plata entre tus cuentas, sin contarse como gasto.",
      },
    ],
  },
  {
    label: "Movimientos",
    items: [
      {
        icon: PencilSimple,
        title: "Ingresos y gastos",
        body: "Salario, freelance, otros; y los gastos del día a día. Con fecha, monto y descripción.",
      },
      {
        icon: Tag,
        title: "Categorías propias",
        body: "Salud, ocio, vivienda, servicios, trabajo, educación, transporte — y las que vos agregués.",
      },
    ],
  },
  {
    label: "Plan",
    items: [
      {
        icon: ChartDonut,
        title: "Topes por categoría",
        body: "Un límite mensual por categoría, con la barra en verde, ámbar o rojo según cómo venís.",
      },
      {
        icon: Target,
        title: "Metas de ahorro",
        body: "El fondo de emergencia, el marchamo, un viaje. Abonás desde una cuenta y ves cuánto falta.",
      },
    ],
  },
  {
    label: "Análisis",
    items: [
      {
        icon: ChartDonut,
        title: "En qué se te va",
        body: "El gasto del mes por categoría, juntando lo fijo y lo variable, en un gráfico de dona.",
      },
      {
        icon: ChartLineUp,
        title: "Mes contra mes",
        body: "Ingresos y egresos de los últimos seis meses, para ver si venís cerrando para arriba o para abajo.",
      },
    ],
  },
  {
    label: "Tus datos",
    items: [
      {
        icon: Trash,
        title: "Tus datos son tuyos",
        body: "Exportás todo a CSV cuando querás, y borrás tus movimientos o la cuenta entera sin escribirle a nadie.",
      },
      {
        icon: Moon,
        title: "Claro y oscuro",
        body: "El tema sigue al sistema, o lo fijás a mano. Se ve bien en los dos.",
      },
    ],
  },
];

function FeatureGroup({ label, items }: { label: string; items: FeatureItem[] }) {
  return (
    <div className="grid gap-4 border-t border-line py-7 first:border-t-0 first:pt-0 md:grid-cols-[130px_minmax(0,1fr)] md:gap-8">
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
    </div>
  );
}

export function Features() {
  return (
    <>
      <div>
        {groups.map((group) => (
          <FeatureGroup key={group.label} label={group.label} items={group.items} />
        ))}
      </div>

      <p className="mt-7 flex items-center gap-2 border-t border-line pt-7 text-xs text-ink-3">
        <DeviceMobile size={14} weight="bold" className="text-ink-3" />
        Se instala en el teléfono como una app, desde el mismo navegador.
      </p>
    </>
  );
}
