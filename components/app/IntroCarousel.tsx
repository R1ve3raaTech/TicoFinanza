"use client";

import { useCallback, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Receipt, Target, Wallet } from "@phosphor-icons/react";
import { GoogleSignIn } from "@/components/auth/GoogleSignIn";
import { BrandMark } from "@/components/brand/BrandMark";
import { Button } from "@/components/ui/Button";
import { markIntroSeen } from "@/lib/intro";

/**
 * La bienvenida del APK: unas láminas que se pasan con el dedo y, en la
 * última, la entrada con Google.
 *
 * **Existe porque la portada no existe en el APK.** En la web, quien abre
 * `ticofinanza.com` cae en una página que le explica de qué se trata antes
 * de pedirle nada. Quien instala una app y la abre no tiene eso: le
 * aparecería un botón de Google a secas, sin saber qué va a abrir.
 *
 * La entrada con Google va **en la última lámina y no en una pantalla
 * aparte**: pasar las láminas y después tener que tocar "Entrar" otra vez
 * es un paso de más en algo que se hace una sola vez.
 *
 * Y lleva la misma casilla de términos que `/entrar`, con el mismo
 * componente: el consentimiento explícito fue una decisión tomada, y una
 * puerta de entrada distinta no puede saltárselo sin querer.
 */
const SLIDES = [
  {
    key: "hola",
    icon: null,
    title: "Bienvenido a TicoFinanza",
    body: "Tus finanzas del mes, en colones y sin conectar tu banco.",
  },
  {
    key: "movimientos",
    icon: Wallet,
    title: "Anotá lo que entra y lo que sale",
    body: "Un gasto se anota en segundos, con su categoría y su cuenta.",
  },
  {
    key: "fijos",
    icon: Receipt,
    title: "Tus pagos fijos, al frente",
    body: "El alquiler, el internet, las cuotas: cada uno con su día de cobro.",
  },
  {
    key: "plan",
    icon: Target,
    title: "Topes, metas y deudas",
    body: "Poné un límite por categoría, apartá para lo grande y llevá cuenta de lo que te deben.",
  },
] as const;

/** La última no está en la lista: es la de entrar, y se arma distinto. */
const TOTAL = SLIDES.length + 1;

/** El ícono de la lámina. La primera no lleva: lleva la marca. */
function SlideIcon({ icon: Icon }: { icon: (typeof SLIDES)[number]["icon"] }) {
  if (!Icon) return <BrandMark size={56} accent />;
  return (
    <span className="flex h-16 w-16 items-center justify-center rounded-surface bg-surface-raised text-accent">
      <Icon size={28} weight="fill" aria-hidden />
    </span>
  );
}

export function IntroCarousel({ authDisabled = false }: { authDisabled?: boolean }) {
  const reduce = useReducedMotion();
  const [index, setIndex] = useState(0);
  // Hacia dónde se mueve, para que la lámina entre por el lado correcto.
  const [direction, setDirection] = useState(1);

  const go = useCallback(
    (next: number) => {
      const target = Math.max(0, Math.min(TOTAL - 1, next));
      setDirection(target > index ? 1 : -1);
      setIndex(target);
    },
    [index]
  );

  // Se marca al llegar a la última, no al entrar: si alguien cierra la app
  // en la pantalla de Google y vuelve, lo que quiere es el botón, no las
  // cuatro láminas otra vez.
  const finish = useCallback(() => {
    markIntroSeen();
    go(TOTAL - 1);
  }, [go]);

  const last = index === TOTAL - 1;
  const slide = last ? null : SLIDES[index];

  return (
    <main className="flex min-h-[100dvh] flex-col bg-ground px-6 pb-8 pt-5 text-ink">
      <div className="flex h-9 items-center justify-between">
        <BrandMark size={26} accent />
        {!last && (
          <Button variant="ghost" size="sm" onClick={finish} className="text-ink-3">
            Saltar
          </Button>
        )}
      </div>

      <div className="relative flex flex-1 items-center justify-center overflow-hidden">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={last ? "entrar" : slide!.key}
            custom={direction}
            initial={reduce ? { opacity: 0 } : { opacity: 0, x: direction * 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, x: direction * -40 }}
            transition={{ duration: reduce ? 0 : 0.22, ease: [0.2, 0, 0, 1] }}
            // Deslizar con el dedo, que es como se pasa una bienvenida en un
            // teléfono. Los puntos de abajo y el botón hacen lo mismo para
            // quien no arrastra.
            drag={reduce ? false : "x"}
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.18}
            onDragEnd={(_, info) => {
              if (info.offset.x < -60) go(index + 1);
              else if (info.offset.x > 60) go(index - 1);
            }}
            className="flex w-full max-w-[22rem] flex-col items-center gap-5 text-center"
          >
            {last ? (
              <>
                <BrandMark size={48} accent />
                <h1 className="text-2xl font-semibold tracking-tight text-ink">
                  Entrá para empezar
                </h1>
                {/* A la izquierda dentro de la lámina centrada: la casilla
                    de términos y su etiqueta centradas se leen torcidas, y
                    además así queda igual que /entrar. */}
                <div className="w-full text-left">
                  <GoogleSignIn disabled={authDisabled} />
                </div>
              </>
            ) : (
              <>
                <SlideIcon icon={slide!.icon} />
                <h1 className="text-balance text-2xl font-semibold leading-tight tracking-tight text-ink">
                  {slide!.title}
                </h1>
                <p className="text-balance text-base leading-relaxed text-ink-2">{slide!.body}</p>
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="flex flex-col items-center gap-6">
        <ol className="flex items-center gap-2" aria-label="Láminas de la bienvenida">
          {Array.from({ length: TOTAL }, (_, i) => (
            <li key={i}>
              <button
                type="button"
                aria-label={`Ir a la lámina ${i + 1} de ${TOTAL}`}
                aria-current={i === index ? "step" : undefined}
                onClick={() => (i === TOTAL - 1 ? finish() : go(i))}
                className={`h-1.5 cursor-pointer rounded-full transition-[width,background-color] duration-200 ${
                  i === index ? "w-6 bg-accent" : "w-1.5 bg-line-strong"
                }`}
              />
            </li>
          ))}
        </ol>

        {!last && (
          <Button
            variant="primary"
            className="h-11 w-full max-w-[22rem]"
            onClick={() => (index === TOTAL - 2 ? finish() : go(index + 1))}
          >
            {index === TOTAL - 2 ? "Entrar" : "Siguiente"}
            <ArrowRight size={16} />
          </Button>
        )}
      </div>
    </main>
  );
}
