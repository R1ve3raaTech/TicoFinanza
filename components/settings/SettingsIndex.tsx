"use client";

import { useEffect, useRef, useState, type MouseEvent } from "react";
import { useReducedMotion } from "framer-motion";
import { SETTINGS_SECTIONS, type SettingsSectionId } from "./sections";

/**
 * Índice propio de Ajustes. En escritorio es una columna fija a la izquierda;
 * en teléfono y tablet, una fila que se desliza de costado y queda pegada
 * arriba al hacer scroll. Marca la sección que se está leyendo y salta a
 * cualquiera sin dejar #hash en la URL.
 */
export function SettingsIndex() {
  const reduce = useReducedMotion();
  const [active, setActive] = useState<SettingsSectionId>(SETTINGS_SECTIONS[0].id);
  const itemRefs = useRef<Partial<Record<SettingsSectionId, HTMLAnchorElement | null>>>({});

  useEffect(() => {
    let frame = 0;

    function update() {
      frame = 0;
      const offset = window.innerWidth >= 1024 ? 80 : window.innerWidth >= 768 ? 90 : 140;
      let current: SettingsSectionId = SETTINGS_SECTIONS[0].id;
      for (const section of SETTINGS_SECTIONS) {
        const el = document.getElementById(section.id);
        if (el && el.getBoundingClientRect().top <= offset) current = section.id;
      }
      // Al fondo de la página las últimas secciones nunca llegan arriba.
      const atBottom =
        window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4;
      if (atBottom) current = SETTINGS_SECTIONS[SETTINGS_SECTIONS.length - 1].id;
      setActive(current);
    }

    function onScroll() {
      if (!frame) frame = requestAnimationFrame(update);
    }

    frame = requestAnimationFrame(update);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  // En la fila horizontal, que la sección activa no quede fuera de vista.
  useEffect(() => {
    if (window.innerWidth >= 1024) return;
    itemRefs.current[active]?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [active]);

  function go(e: MouseEvent<HTMLAnchorElement>, id: SettingsSectionId) {
    const el = document.getElementById(id);
    if (!el) return;
    e.preventDefault();
    el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
    setActive(id);
  }

  return (
    <nav
      aria-label="Secciones de ajustes"
      className="sticky top-14 z-20 -mx-4 mb-6 border-b border-line bg-ground md:top-0 md:-mx-8 lg:top-10 lg:mx-0 lg:mb-0 lg:self-start lg:border-b-0 lg:bg-transparent"
    >
      <ul className="flex overflow-x-auto px-2 scrollbar-none md:px-6 lg:flex-col lg:overflow-visible lg:border-l lg:border-line lg:px-0">
        {SETTINGS_SECTIONS.map((section) => {
          const isActive = active === section.id;
          return (
            <li key={section.id} className="shrink-0">
              <a
                ref={(el) => {
                  itemRefs.current[section.id] = el;
                }}
                href={`#${section.id}`}
                onClick={(e) => go(e, section.id)}
                aria-current={isActive ? "location" : undefined}
                className={`flex h-11 items-center whitespace-nowrap border-b-2 px-2.5 text-label transition-colors duration-150 lg:-ml-px lg:h-auto lg:border-b-0 lg:border-l-2 lg:py-1.5 lg:pl-3.5 ${
                  isActive
                    ? "border-accent text-ink"
                    : "border-transparent font-normal text-ink-3 hover:text-ink"
                }`}
              >
                {section.label}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
