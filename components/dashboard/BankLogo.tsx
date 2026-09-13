import Image from "next/image";
import { Money } from "@phosphor-icons/react/dist/ssr";
import { BANK_BRAND } from "@/lib/bankBrand";
import type { BankName } from "@/lib/types";

/**
 * Identificador del banco de un movimiento. Es de los pocos íconos con fondo
 * que quedan en la app, y está justificado: se reconoce un banco por su logo
 * mucho más rápido que leyendo su nombre. Cuadrado con esquinas suaves (no
 * círculo) y un filo de línea para que el chip blanco no se pierda sobre
 * fondo claro.
 */
export function BankLogo({
  bank,
  size = 32,
}: {
  bank: BankName;
  size?: number;
}) {
  const brand = BANK_BRAND[bank];
  const radius = size <= 20 ? 4 : 6;
  const frame = "flex shrink-0 items-center justify-center overflow-hidden shadow-[inset_0_0_0_1px_var(--line)]";

  // Efectivo va neutro: su color de marca era verde, y en esta app el verde
  // significa "ingreso" — un gasto en efectivo no puede llevar ese color.
  if (bank === "Efectivo") {
    return (
      <div
        title={brand.label}
        style={{ width: size, height: size, borderRadius: radius }}
        className={`${frame} bg-surface-raised text-ink-2`}
      >
        <Money size={Math.round(size * 0.55)} />
      </div>
    );
  }

  if (brand.logo) {
    // Padding proporcional al tamaño: uno fijo se come el logo en los chicos.
    const padding = Math.round(size * 0.1);
    return (
      <div
        title={brand.label}
        style={{
          width: size,
          height: size,
          borderRadius: radius,
          background: brand.chipBg ?? "#ffffff",
          padding,
        }}
        className={frame}
      >
        <Image
          src={brand.logo}
          alt={brand.label}
          width={size}
          height={size}
          className="h-full w-full object-contain"
        />
      </div>
    );
  }

  return (
    <div
      title={brand.label}
      style={{ width: size, height: size, borderRadius: radius, fontSize: size * 0.34 }}
      className={`${frame} bg-surface-raised font-semibold tracking-tight text-ink-2`}
    >
      {brand.initials}
    </div>
  );
}
