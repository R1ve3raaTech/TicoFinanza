import { BrandMark } from "@/components/brand/BrandMark";

/**
 * Símbolo + nombre. El nombre va en la misma Geist de la interfaz (no en una
 * tipografía de display aparte): la personalidad la pone el símbolo.
 */
export function Logo({
  subtitle,
  size = "sm",
  accent = false,
}: {
  subtitle?: string;
  size?: "sm" | "lg";
  /** Versión secundaria: la pieza chica del símbolo en el color de acento. */
  accent?: boolean;
}) {
  const lg = size === "lg";
  return (
    <span className={`inline-flex min-w-0 items-center text-ink ${lg ? "gap-3" : "gap-2"}`}>
      <BrandMark size={lg ? 30 : 18} accent={accent} className="shrink-0" />
      <span className="flex min-w-0 flex-col">
        <span
          className={
            lg
              ? "whitespace-nowrap text-[1.5rem] font-semibold leading-none tracking-[-0.03em]"
              : "whitespace-nowrap text-[0.9375rem] font-semibold leading-none tracking-[-0.02em]"
          }
        >
          TicoFinanza
        </span>
        {/* El subtítulo se esconde en pantallas chicas: ahí partía en dos
            líneas y desalineaba el header contra el botón. */}
        {subtitle && (
          <span
            className={`hidden whitespace-nowrap text-ink-3 sm:inline ${
              lg ? "mt-1.5 text-sm" : "mt-1 text-micro"
            }`}
          >
            {subtitle}
          </span>
        )}
      </span>
    </span>
  );
}
