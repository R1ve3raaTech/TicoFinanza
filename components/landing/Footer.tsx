"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowUpRight, ShieldCheck, SquaresFour } from "@phosphor-icons/react";
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

const marqueeBanks: BankName[] = ["BAC", "BCR", "BNCR", "BP", "Davivienda", "MUCAP", "PayPal"];

const MotionLink = motion.create(Link);

export function Footer({ loggedIn = false }: { loggedIn?: boolean }) {
  const reduce = useReducedMotion();
  const year = new Date().getFullYear();

  return (
    <motion.footer
      initial={reduce ? undefined : { opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="relative mt-auto overflow-hidden border-t border-line bg-ground"
    >
      <div className="relative mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 py-16 sm:px-6 md:flex-row md:items-end md:justify-between">
        <div className="flex flex-col items-center text-center md:items-start md:text-left">
          <p className="select-none font-montserrat text-4xl font-bold leading-none tracking-tighter text-ink sm:text-5xl">
            TicoFinanza
          </p>
          <p className="mt-4 max-w-[36ch] text-sm leading-relaxed text-ink-3">
            Tus movimientos bancarios, categorizados solos. Sin hojas de cálculo, sin
            anotar nada a mano.
          </p>
          <MotionLink
            href={loggedIn ? "/dashboard" : "/entrar"}
            whileHover={reduce ? undefined : { x: 2 }}
            className="mt-6 inline-flex items-center gap-2 rounded-full border border-line py-2 pl-2 pr-4 text-sm text-ink-2 transition-colors hover:border-line-strong hover:text-ink"
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-zinc-50">
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

      <div
        className="relative border-y border-line py-5"
        style={{
          maskImage: "linear-gradient(to right, transparent, black 8%, black 92%, transparent)",
          WebkitMaskImage:
            "linear-gradient(to right, transparent, black 8%, black 92%, transparent)",
        }}
      >
        <div className={`flex w-max items-center gap-14 ${reduce ? "" : "auth-marquee"}`}>
          {[...marqueeBanks, ...marqueeBanks].map((bank, i) => (
            <div key={`${bank}-${i}`} className="flex shrink-0 items-center gap-2 opacity-50">
              <BankLogo bank={bank} size={22} />
            </div>
          ))}
        </div>
      </div>

      <div className="relative mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-3 px-4 py-5 text-xs text-ink-3 sm:flex-row sm:px-6">
        <span>© {year} TicoFinanza</span>
        <span className="flex items-center gap-1.5">
          <ShieldCheck size={14} weight="bold" className="text-accent" />
          Solo lectura de correos bancarios. Nunca vendemos tus datos.
        </span>
      </div>
    </motion.footer>
  );
}
