"use client";

/**
 * Interruptor on/off. Es de los pocos elementos redondos de la app: la forma
 * de pastilla acá sí comunica algo (un riel con una perilla que se mueve).
 */
export function Switch({
  checked,
  onChange,
  disabled = false,
  label,
}: {
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
  /** Nombre accesible (el texto visible suele estar en la fila). */
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={onChange}
      className={`relative inline-flex h-6 w-10 shrink-0 items-center rounded-full border transition-colors duration-150 cursor-pointer disabled:cursor-not-allowed disabled:opacity-45 ${
        checked ? "border-accent bg-accent" : "border-line-strong bg-surface-raised"
      }`}
    >
      <span
        aria-hidden
        className={`absolute left-0.5 h-[18px] w-[18px] rounded-full transition-[translate,background-color] duration-150 ${
          checked ? "translate-x-4 bg-white" : "translate-x-0 bg-ink-3"
        }`}
      />
    </button>
  );
}
