"use client";

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
import {
  normalizeCategory,
  resolvedIcon,
  resolvedTone,
  type CategoryChoice,
  type CategoryTone,
} from "@/lib/categoryStyle";
import { MATERIAL_SYMBOLS } from "@/lib/materialSymbols";
import { useCategoryChoices } from "./CategoryStyle";

/**
 * La marquita de una categoría: un ícono sobre un cuadrito de su color.
 *
 * El orden de prioridad es: lo que el usuario eligió para esa categoría
 * (Ajustes → Categorías), y si no eligió nada, lo que la app decide sola.
 * Lo elegido llega por contexto (components/ui/CategoryStyle.tsx) para no
 * tener que pasarle la tabla de categorías a cada fila que dibuja un
 * cuadrito.
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
export function categoryClasses(
  category: string | null | undefined,
  choices: Record<string, CategoryChoice> = {}
) {
  return TONE[resolvedTone(category, choices)];
}

/** Las clases de un tono concreto, para el selector de colores. */
export function toneClasses(tone: CategoryTone) {
  return TONE[tone];
}

export function CategoryMark({
  category,
  size = 32,
  className = "",
  /** Forzar lo que se muestra, sin mirar lo guardado: lo usa el selector. */
  previewIcon,
  previewTone,
  day,
}: {
  category: string | null | undefined;
  /** Lado del cuadrito en píxeles. */
  size?: number;
  className?: string;
  previewIcon?: string | null;
  previewTone?: CategoryTone;
  /**
   * En lugar del ícono, este número. Es el sello del día de cobro de un
   * gasto fijo: ahí el dato que se busca con la vista es el día, y el color
   * de la categoría es lo que agrupa la lista.
   */
  day?: number;
}) {
  const choices = useCategoryChoices();
  const tone = previewTone ? TONE[previewTone] : categoryClasses(category, choices);
  const chosenIcon = previewIcon !== undefined ? previewIcon : resolvedIcon(category, choices);
  const symbol = chosenIcon ? MATERIAL_SYMBOLS[chosenIcon] : undefined;
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
      {day !== undefined ? (
        <span
          style={{ fontSize: Math.round(size * 0.38) }}
          className="money font-medium leading-none"
        >
          {day}
        </span>
      ) : symbol ? (
        // Material Symbols usa este sistema de coordenadas (el eje Y en
        // negativo). Van como trazo y no como fuente: ver lib/materialSymbols.ts.
        <svg
          viewBox="0 -960 960 960"
          width={Math.round(size * 0.62)}
          height={Math.round(size * 0.62)}
          fill="currentColor"
        >
          <path d={symbol.path} />
        </svg>
      ) : Icon ? (
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
  const choices = useCategoryChoices();
  return (
    <span
      aria-hidden
      className={`inline-block h-2 w-2 shrink-0 rounded-[2px] ${categoryClasses(category, choices).dot} ${className}`}
    />
  );
}
