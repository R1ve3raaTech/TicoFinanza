"use client";

import { useEffect, useState } from "react";
import { AnchorLink } from "./AnchorLink";

export interface SpineSection {
  id: string;
  label: string;
}

/**
 * La columna de la izquierda: dónde estás en la página.
 *
 * Es el rail de la app, en la landing. La app con sesión es un rail angosto
 * con la sección activa marcada más un panel ancho de contenido; que la
 * página que la vende tenga otra gramática visual es una pequeña mentira
 * sobre el producto. De paso reemplaza la navegación del encabezado, que
 * solo aparecía de 1024px para arriba: debajo de eso no había forma de saber
 * qué más traía la página.
 */
export function LandingSpine({ sections }: { sections: SpineSection[] }) {
  const [active, setActive] = useState(sections[0]?.id ?? "");

  useEffect(() => {
    const targets = sections
      .map((section) => document.getElementById(section.id))
      .filter((el): el is HTMLElement => Boolean(el));
    if (targets.length === 0) return;

    // La última sección cuyo borde superior ya pasó la línea de lectura.
    //
    // Con IntersectionObserver había que elegir entre varias secciones que
    // cruzan la franja a la vez, y con alturas tan distintas (tres pasos
    // contra una captura de pantalla completa) cualquier criterio de
    // desempate fallaba en algún punto del scroll. Esto es una sola regla y
    // siempre marca exactamente una.
    const LINE = 140;
    let frame = 0;

    const update = () => {
      frame = 0;
      let current = targets[0].id;
      for (const target of targets) {
        if (target.getBoundingClientRect().top <= LINE) current = target.id;
      }
      setActive(current);
    };

    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [sections]);

  return (
    <nav aria-label="Secciones de la página" className="sticky top-24 hidden lg:block">
      <ul className="flex flex-col gap-0.5">
        {sections.map((section) => {
          const current = active === section.id;
          return (
            <li key={section.id}>
              <AnchorLink
                href={`#${section.id}`}
                aria-current={current ? "true" : undefined}
                className={`-ml-2.5 flex items-center gap-2.5 rounded-control py-1.5 pl-2.5 pr-3 text-label transition-colors duration-150 ${
                  current ? "text-ink" : "font-normal text-ink-3 hover:text-ink"
                }`}
              >
                {/* La barrita activa es la misma señal que usa el rail de la
                    app, no un punto de color decorativo. */}
                <span
                  aria-hidden
                  className={`h-4 w-px shrink-0 transition-colors duration-150 ${
                    current ? "bg-accent" : "bg-line-strong"
                  }`}
                />
                {section.label}
              </AnchorLink>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/**
 * El nombre de la sección en teléfono, donde no hay espina. Va con el
 * contenido, no flotando: ocupa una línea y dice dónde estás.
 */
export function SectionLabel({ children }: { children: string }) {
  return (
    <p className="mb-6 flex items-center gap-2.5 text-label text-ink-3 lg:hidden">
      <span aria-hidden className="h-4 w-px shrink-0 bg-accent" />
      {children}
    </p>
  );
}
