import {
  Barbell,
  Bus,
  Confetti,
  DotsThreeOutline,
  ForkKnife,
  GraduationCap,
  House,
  Lightning,
  Briefcase,
} from "@phosphor-icons/react/dist/ssr";
// El tipo `Icon` solo lo exporta el paquete principal; los componentes vienen
// de `/dist/ssr`, que es el que se puede usar en una pantalla de servidor.
import type { Icon } from "@phosphor-icons/react";
import { categoryTone, normalizeCategory, type CategoryTone } from "@/lib/categoryStyle";

/**
 * La marquita de una categoría: un ícono propio sobre un cuadrito del color
 * de la categoría.
 *
 * Se importa de `@phosphor-icons/react/dist/ssr` a propósito y el archivo no
 * lleva "use client": así el mismo componente sirve en las pantallas que se
 * arman en el servidor y en las listas que son de cliente.
 *
 * Las clases están escritas enteras en una tabla y no armadas con plantillas
 * (`bg-cat-${tono}`): Tailwind lee el código fuente buscando clases, y una
 * clase que solo existe al ejecutar nunca llega al CSS.
 */
const TONE: Record<CategoryTone, { text: string; soft: string; dot: string }> = {
  naranja: { text: "text-cat-naranja", soft: "bg-cat-naranja/12", dot: "bg-cat-naranja" },
  indigo: { text: "text-cat-indigo", soft: "bg-cat-indigo/12", dot: "bg-cat-indigo" },
  celeste: { text: "text-cat-celeste", soft: "bg-cat-celeste/12", dot: "bg-cat-celeste" },
  cian: { text: "text-cat-cian", soft: "bg-cat-cian/12", dot: "bg-cat-cian" },
  azul: { text: "text-cat-azul", soft: "bg-cat-azul/12", dot: "bg-cat-azul" },
  violeta: { text: "text-cat-violeta", soft: "bg-cat-violeta/12", dot: "bg-cat-violeta" },
  fucsia: { text: "text-cat-fucsia", soft: "bg-cat-fucsia/12", dot: "bg-cat-fucsia" },
  pizarra: { text: "text-cat-pizarra", soft: "bg-cat-pizarra/12", dot: "bg-cat-pizarra" },
  piedra: { text: "text-cat-piedra", soft: "bg-cat-piedra/12", dot: "bg-cat-piedra" },
  verde: { text: "text-cat-verde", soft: "bg-cat-verde/12", dot: "bg-cat-verde" },
};

/** Ícono de las categorías que trae la app. El resto usa el genérico. */
const ICONS: Record<string, Icon> = {
  alimentacion: ForkKnife,
  vivienda: House,
  servicios: Lightning,
  salud: Barbell,
  transporte: Bus,
  educacion: GraduationCap,
  ocio: Confetti,
  trabajo: Briefcase,
  salario: Briefcase,
  freelance: Briefcase,
  // "Otro" y "Otros" son de la app y no tienen nada que representar: van con
  // el glifo genérico, no con su inicial (la inicial es para distinguir una
  // categoría propia de otra).
  otro: DotsThreeOutline,
  otros: DotsThreeOutline,
};

export function categoryIcon(category: string | null | undefined): Icon {
  if (!category) return DotsThreeOutline;
  return ICONS[normalizeCategory(category)] ?? DotsThreeOutline;
}

/** Las clases de color de una categoría, para teñir algo que no es la marca
 *  (el sello del día en Fijos, por ejemplo). */
export function categoryClasses(category: string | null | undefined) {
  return TONE[categoryTone(category)];
}

export function CategoryMark({
  category,
  size = 32,
  className = "",
}: {
  category: string | null | undefined;
  /** Lado del cuadrito en píxeles. */
  size?: number;
  className?: string;
}) {
  const tone = categoryClasses(category);
  // La tabla se indexa acá y no con `categoryIcon()`: el compilador de React
  // no distingue una función que BUSCA un componente de una que lo CREA, y
  // marca error al ver un componente saliendo de una llamada en el render.
  const Icon = ICONS[normalizeCategory(category ?? "")];
  // Una categoría propia ("Ferretería", "Mascotas") no tiene ícono que la
  // represente, así que lleva su inicial. Con el mismo glifo genérico para
  // todas, dos categorías propias que caen en tonos parecidos se veían
  // iguales; la letra las separa siempre.
  const initial = category?.trim()?.[0]?.toUpperCase();

  return (
    <span
      // `aria-hidden`: el nombre de la categoría siempre está escrito al
      // lado. Anunciarlo dos veces solo alarga la fila para quien la escucha.
      aria-hidden
      style={{ width: size, height: size }}
      className={`flex shrink-0 items-center justify-center rounded-control ${tone.soft} ${tone.text} ${className}`}
    >
      {Icon ? (
        <Icon size={Math.round(size * 0.5)} weight="fill" />
      ) : initial ? (
        <span style={{ fontSize: Math.round(size * 0.46) }} className="font-semibold leading-none">
          {initial}
        </span>
      ) : (
        <DotsThreeOutline size={Math.round(size * 0.5)} weight="fill" />
      )}
    </span>
  );
}

/** Punto del color de la categoría, para donde no cabe la marca entera. */
export function CategoryDot({ category, className = "" }: { category: string | null; className?: string }) {
  return (
    <span
      aria-hidden
      className={`inline-block h-2 w-2 shrink-0 rounded-[2px] ${categoryClasses(category).dot} ${className}`}
    />
  );
}
