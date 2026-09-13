"use client";

import { useEffect, useId, useRef, useSyncExternalStore, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { X } from "@phosphor-icons/react";
import { useLockBodyScroll } from "@/lib/useLockBodyScroll";
import { Button } from "./Button";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

const WIDTHS = {
  sm: "sm:max-w-[380px]",
  md: "sm:max-w-[440px]",
  lg: "sm:max-w-[520px]",
} as const;

/**
 * Diálogo único de la app. Antes cada modal traía su propio fondo, panel y
 * botón de cerrar copiados a mano (ocho variantes casi iguales); ninguno
 * cerraba con Escape ni devolvía el foco al cerrarse.
 *
 * - En teléfono es una hoja que sube desde abajo (al alcance del pulgar); de
 *   `sm` en adelante, un panel centrado.
 * - Siempre en un portal a <body>: un ancestro con `transform` (ej. una
 *   animación de entrada) crea un containing block nuevo y rompe
 *   `position: fixed` si el diálogo se queda dentro del árbol.
 * - Escape cierra, Tab queda atrapado adentro, y al cerrar el foco vuelve al
 *   elemento que lo abrió.
 */
export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
  role = "dialog",
  dismissible = true,
  layer = "base",
  showClose = true,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  /** Botones de acción. En teléfono se reparten el ancho. */
  footer?: ReactNode;
  size?: keyof typeof WIDTHS;
  role?: "dialog" | "alertdialog";
  /** false mientras hay algo en curso que no se puede interrumpir. */
  dismissible?: boolean;
  /** "top" para confirmaciones que se abren encima de otro diálogo. */
  layer?: "base" | "top";
  showClose?: boolean;
}) {
  const reduce = useReducedMotion();
  const titleId = useId();
  const descriptionId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
  useLockBodyScroll(open);

  // Guardado en ref para que el efecto de teclado no se re-suscriba en cada
  // render del padre (onClose casi siempre es una función nueva).
  const closeRef = useRef(onClose);
  const dismissibleRef = useRef(dismissible);
  useEffect(() => {
    closeRef.current = onClose;
    dismissibleRef.current = dismissible;
  });

  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;

    // Enfoca el primer campo con autoFocus si lo hay; si no, el panel mismo
    // (no el botón de cerrar: que Enter cierre sin querer es peor).
    const frame = requestAnimationFrame(() => {
      const panel = panelRef.current;
      if (!panel) return;
      const auto = panel.querySelector<HTMLElement>("[autofocus], [data-autofocus]");
      (auto ?? panel).focus();
    });

    function onKeyDown(e: KeyboardEvent) {
      const panel = panelRef.current;
      if (!panel) return;
      if (e.key === "Escape") {
        // Si hay otro diálogo abierto encima, que lo cierre ese.
        const dialogs = document.querySelectorAll("[data-dialog-panel]");
        if (dialogs[dialogs.length - 1] !== panel) return;
        e.stopPropagation();
        if (dismissibleRef.current) closeRef.current();
        return;
      }
      if (e.key !== "Tab") return;
      const focusables = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (focusables.length === 0) {
        e.preventDefault();
        return;
      }
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && (document.activeElement === first || document.activeElement === panel)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("keydown", onKeyDown);
      previouslyFocused?.focus?.();
    };
  }, [open]);

  if (!mounted) return null;

  const z = layer === "top" ? "z-[70]" : "z-50";

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className={`fixed inset-0 ${z} flex items-end justify-center sm:items-center sm:p-6`}>
          <motion.div
            aria-hidden
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16 }}
            onClick={() => dismissible && onClose()}
            className="absolute inset-0 bg-scrim"
          />
          <motion.div
            ref={panelRef}
            data-dialog-panel
            role={role}
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={description ? descriptionId : undefined}
            tabIndex={-1}
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: 8 }}
            transition={{ duration: 0.16, ease: [0.2, 0, 0, 1] }}
            className={`relative flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-dialog border-t border-line bg-surface outline-none sm:rounded-dialog sm:border ${WIDTHS[size]}`}
          >
            <div
              className={`flex shrink-0 items-start justify-between gap-4 px-5 pt-4 ${children ? "pb-3" : "pb-5"}`}
            >
              <div className="min-w-0">
                <h2 id={titleId} className="text-heading text-ink">
                  {title}
                </h2>
                {description && (
                  <p id={descriptionId} className="mt-1 text-sm text-ink-2">
                    {description}
                  </p>
                )}
              </div>
              {showClose && dismissible && (
                <Button
                  variant="ghost"
                  size="sm"
                  icon
                  onClick={onClose}
                  aria-label="Cerrar"
                  className="-mr-2 -mt-1"
                >
                  <X size={16} />
                </Button>
              )}
            </div>

            {children && (
              <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5">{children}</div>
            )}

            {footer && (
              <div className="flex shrink-0 gap-2 border-t border-line px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:justify-end sm:pb-3 [&>*]:flex-1 sm:[&>*]:flex-none">
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
