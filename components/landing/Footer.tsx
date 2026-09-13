"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowUpRight, ShieldCheck, SquaresFour } from "@phosphor-icons/react";
import { BrandMark } from "@/components/brand/BrandMark";
import { BankLogo } from "@/components/dashboard/BankLogo";
import { GoogleMark } from "@/components/GoogleMark";
import { AnchorLink } from "@/components/landing/AnchorLink";
import type { BankName } from "@/lib/types";

const links = [
  { label: "Cómo funciona", href: "#como-funciona" },
  { label: "Funciones", href: "#funciones" },
  { label: "Precio", href: "#precio" },
  { label: "Preguntas frecuentes", href: "#preguntas" },
  { label: "Política de privacidad", href: "/privacidad" },
  { label: "Términos de servicio", href: "/terminos" },
  { label: "Escribinos", href: "mailto:info@ticofinanza.com" },
];

const supportedBanks: BankName[] = ["BAC", "BCR", "BNCR", "BP", "Davivienda", "MUCAP", "PayPal"];

const MotionLink = motion.create(Link);

export function Footer({ loggedIn = false }: { loggedIn?: boolean }) {
  const reduce = useReducedMotion();
  const year = new Date().getFullYear();

  return (
    <motion.footer
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: reduce ? 0 : 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="mt-auto border-t border-line bg-ground"
    >
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 py-14 sm:px-6 md:flex-row md:items-end md:justify-between">
        <div className="flex flex-col items-center text-center md:items-start md:text-left">
          <p className="flex select-none items-center gap-3 text-ink">
            <BrandMark size={32} accent className="shrink-0" />
            <span className="text-3xl font-semibold leading-none tracking-[-0.03em] sm:text-4xl">
              TicoFinanza
            </span>
          </p>
          <p className="mt-4 max-w-[36ch] text-sm leading-relaxed text-ink-3">
            Tus movimientos bancarios, categorizados solos. Sin hojas de cálculo, sin
            anotar nada a mano.
          </p>
          <MotionLink
            href={loggedIn ? "/dashboard" : "/entrar"}
            whileHover={reduce ? undefined : { x: 2 }}
            className="mt-6 inline-flex items-center gap-2 rounded-control border border-line py-2 pl-2 pr-4 text-sm text-ink-2 transition-colors hover:border-line-strong hover:text-ink"
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-[4px] bg-zinc-50">
              {loggedIn ? (
                <SquaresFour size={13} weight="bold" className="text-accent-deep" />
              ) : (
                <GoogleMark size={13} />
              )}
            </span>
            {loggedIn ? "Ir al dashboard" : "Iniciar sesión"}
            <ArrowUpRight size={14} weight="bold" className="text-accent" />
          </MotionLink>
        </div>

        <nav className="flex flex-col items-center gap-3 md:items-end">
          {links.map((link) =>
            link.href.startsWith("#") ? (
              <AnchorLink
                key={link.label}
                href={link.href}
                className="text-sm text-ink-3 transition-colors hover:text-ink"
              >
                {link.label}
              </AnchorLink>
            ) : (
              <a
                key={link.label}
                href={link.href}
                className="text-sm text-ink-3 transition-colors hover:text-ink"
              >
                {link.label}
              </a>
            )
          )}
        </nav>
      </div>

      {/* Fila estática de bancos compatibles (antes un marquee infinito —
          movimiento decorativo constante que la nueva guía visual no
          permite). */}
      <div className="border-y border-line py-4">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-center gap-x-8 gap-y-3 px-4 opacity-70 sm:px-6">
          {supportedBanks.map((bank) => (
            <BankLogo key={bank} bank={bank} size={22} />
          ))}
        </div>
      </div>

      <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-3 px-4 py-5 text-xs text-ink-3 sm:flex-row sm:px-6">
        <span>© {year} TicoFinanza</span>
        <span className="flex items-center gap-1.5">
          <ShieldCheck size={14} weight="bold" className="text-accent" />
          Solo lectura de correos bancarios. Nunca vendemos tus datos.
        </span>
      </div>
    </motion.footer>
  );
}
