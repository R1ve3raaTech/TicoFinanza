import { BankLogo } from "@/components/dashboard/BankLogo";
import { Money } from "@/components/ui/Money";
import type { BankName } from "@/lib/types";

const rows: { bank: BankName; description: string; meta: string; amount: number }[] = [
  { bank: "BAC", description: "AutoMercado", meta: "BAC · Supermercado", amount: -8450 },
  { bank: "BP", description: "María Solano", meta: "Banco Popular · SINPE Móvil", amount: 25000 },
  { bank: "PayPal", description: "Uber Eats", meta: "PayPal · Comida", amount: -6800 },
  { bank: "BCR", description: "EPA", meta: "BCR · Hogar", amount: -18500 },
];

const banks: BankName[] = ["BAC", "BCR", "BNCR", "BP", "Davivienda", "MUCAP", "PayPal"];

/**
 * Panel lateral del login (solo escritorio): el producto tal cual se ve —
 * una lista de movimientos de ejemplo — en vez de tarjetas flotando sobre
 * manchas de color.
 */
export function AuthShowcase() {
  return (
    <aside
      aria-label="Cómo funciona TicoFinanza"
      className="hidden border-l border-line bg-surface lg:flex lg:flex-col lg:justify-center lg:px-14 xl:px-20"
    >
      <div className="w-full max-w-md">
        <p className="text-[1.375rem] font-semibold leading-snug tracking-[-0.02em] text-ink">
          Tus movimientos aparecen solos, mientras hacés otra cosa.
        </p>
        <p className="mt-2 text-sm leading-relaxed text-ink-3">
          Cada notificación de tu banco se convierte en un gasto o ingreso, ya categorizado.
        </p>

        <div className="mt-10">
          <div className="flex items-baseline justify-between border-b border-line pb-2">
            <span className="text-label text-ink-2">Hoy</span>
            <span className="text-meta text-ink-3">Ejemplo</span>
          </div>
          <ul>
            {rows.map((row) => (
              <li key={row.description} className="flex items-center gap-3 border-b border-line py-3">
                <BankLogo bank={row.bank} size={32} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink">{row.description}</p>
                  <p className="truncate text-meta text-ink-3">{row.meta}</p>
                </div>
                <Money
                  value={row.amount}
                  plus
                  className={`text-sm font-medium ${row.amount > 0 ? "text-income" : "text-ink"}`}
                />
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-10">
          <p className="text-meta text-ink-3">Compatible con</p>
          <ul className="mt-3 flex flex-wrap items-center gap-2">
            {banks.map((bank) => (
              <li key={bank}>
                <BankLogo bank={bank} size={28} />
              </li>
            ))}
          </ul>
        </div>
      </div>
    </aside>
  );
}
