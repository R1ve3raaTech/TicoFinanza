"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { CaretUpDown, DownloadSimple, SignOut, UserCircle } from "@phosphor-icons/react";
import { SignOutDialog } from "@/components/dashboard/SignOutButton";
import { useInstallApp } from "@/components/InstallAppButton";
import { Avatar } from "./Avatar";

const ITEM =
  "flex h-9 w-full items-center gap-2.5 rounded-[5px] px-2.5 text-sm text-ink-2 outline-none transition-colors duration-150 cursor-pointer hover:bg-surface-hover hover:text-ink focus:bg-surface-hover focus:text-ink";

/**
 * Cuenta del usuario al pie del rail. Cerrar sesión e instalar la app viven
 * acá adentro y no a la vista: son acciones de una vez, no tienen por qué
 * competir con la navegación todo el tiempo.
 */
export function UserMenu({
  name,
  email,
  avatarUrl,
}: {
  name?: string;
  email?: string;
  avatarUrl?: string;
}) {
  const reduce = useReducedMotion();
  const [open, setOpen] = useState(false);
  const [confirmingSignOut, setConfirmingSignOut] = useState(false);
  const { visible: canInstall, install, hint } = useInstallApp();
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    // preventScroll: el rail es sticky y enfocar algo adentro llegaba a
    // mover el scroll de la página.
    menuRef.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus({ preventScroll: true });

    function onPointerDown(e: PointerEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
        return;
      }
      if (e.key === "Tab") {
        setOpen(false);
        return;
      }
      if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
      e.preventDefault();
      const items = Array.from(
        menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? []
      );
      const index = items.indexOf(document.activeElement as HTMLElement);
      const next =
        e.key === "ArrowDown"
          ? (index + 1) % items.length
          : (index - 1 + items.length) % items.length;
      items[next]?.focus();
    }

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const displayName = name ?? "Tu cuenta";

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={`Cuenta: ${displayName}`}
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-center gap-2.5 rounded-control p-1.5 text-left transition-colors duration-150 cursor-pointer hover:bg-surface-hover xl:justify-start xl:px-2"
      >
        <Avatar src={avatarUrl} name={name} size={28} />
        <span className="hidden min-w-0 flex-1 xl:block">
          <span className="block truncate text-label text-ink">{displayName}</span>
          {email && <span className="block truncate text-micro text-ink-3">{email}</span>}
        </span>
        <CaretUpDown size={14} className="hidden shrink-0 text-ink-3 xl:block" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            ref={menuRef}
            id={menuId}
            role="menu"
            aria-label="Cuenta"
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
            className="absolute bottom-0 left-full z-50 ml-3 w-60 rounded-surface border border-line bg-surface p-1 shadow-[0_10px_30px_-10px_rgb(0_0_0/0.35)] xl:bottom-full xl:left-0 xl:mb-2 xl:ml-0 xl:w-full"
          >
            {/* En el rail angosto el botón es solo la foto: el nombre va acá. */}
            <div className="px-2.5 pb-2 pt-1.5 xl:hidden">
              <p className="truncate text-label text-ink">{displayName}</p>
              {email && <p className="truncate text-micro text-ink-3">{email}</p>}
            </div>
            <Link
              href="/dashboard/settings"
              role="menuitem"
              onClick={() => setOpen(false)}
              className={ITEM}
            >
              <UserCircle size={16} />
              Perfil y ajustes
            </Link>
            {canInstall && (
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  install();
                }}
                className={ITEM}
              >
                <DownloadSimple size={16} />
                Instalar la app
              </button>
            )}
            <div role="separator" className="mx-1 my-1 h-px bg-line" />
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                setConfirmingSignOut(true);
              }}
              className={ITEM}
            >
              <SignOut size={16} />
              Cerrar sesión
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {hint}
      <SignOutDialog open={confirmingSignOut} onClose={() => setConfirmingSignOut(false)} />
    </div>
  );
}
