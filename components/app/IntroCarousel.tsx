"use client";

import { useCallback, useState } from "react";
import { AnimatePresence, motion, MotionConfig } from "framer-motion";
import { ArrowRight, Check } from "@phosphor-icons/react";
import { GoogleSignIn } from "@/components/auth/GoogleSignIn";
import { BrandMark } from "@/components/brand/BrandMark";
import { Button } from "@/components/ui/Button";
import {
  VisualAnotar,
  VisualFijos,
  VisualPlan,
  VisualSaldo,
} from "@/components/app/IntroVisuals";
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
 *
 * **Cada lámina muestra la pantalla de la que habla** (`IntroVisuals`) y no
 * un ícono suelto. Antes era un ícono de 64px, un título y una línea
 * centrados con `flex-1`: tres elementos chicos flotando dejaban media
 * pantalla muerta arriba y abajo, y lo que se prometía no se parecía a lo
 * que se iba a abrir.
 *
 * **El movimiento va todo bajo `MotionConfig reducedMotion="user"`**, así
 * ninguna lámina tiene que acordarse de apagar su animación: con
 * `prefers-reduced-motion` framer deja de animar transformaciones por su
 * cuenta. Lo que no es transformación —el ancho de las barras, el cursor
 * que parpadea— se apaga dentro de `IntroVisuals`.
 */
const SLIDES = [
  {
    key: "hola",
    title: "Bienvenido a TicoFinanza",
    body: "Todo tu mes en una pantalla: lo que entró, lo que salió y lo que queda.",
    visual: VisualSaldo,
    points: [
      "Solo colones, sin conversiones raras",
      "No se conecta a tu banco ni te pide claves",
      "Se abre sin señal con lo último que viste",
    ],
  },
  {
    key: "movimientos",
    title: "Anotá lo que entra y lo que sale",
    body: "Un gasto se anota en segundos: descripción, monto, categoría y de qué cuenta salió.",
    visual: VisualAnotar,
    points: [
      "Lo que repetís se llena con un toque",
      "Podés adjuntar la foto del comprobante",
      "Sin señal queda en cola y se sube solo",
    ],
  },
  {
    key: "fijos",
    title: "Tus pagos fijos, al frente",
    body: "El alquiler, el internet, las cuotas: cada uno con su día de cobro y su estado del mes.",
    visual: VisualFijos,
    points: [
      "Te avisa dos días antes del cobro",
      "Marcás pagado y se descuenta de la cuenta",
      "El ciclo se reinicia solo cada mes",
    ],
  },
  {
    key: "plan",
    title: "Topes, metas y deudas",
    body: "Poné un límite por categoría, apartá para lo grande y llevá cuenta de lo que te deben.",
    visual: VisualPlan,
    points: [
      "Un tope por mes, no un límite eterno",
      "Las metas se van llenando con cada abono",
      "Una deuda no toca tus cuentas hasta saldarla",
    ],
  },
] as const;

/** La última no está en la lista: es la de entrar, y se arma distinta. */
const TOTAL = SLIDES.length + 1;

/** Los puntos de cada lámina: lo concreto, debajo de la promesa. */
function Puntos({ items }: { items: readonly string[] }) {
  return (
    <ul className="flex w-full flex-col gap-2 text-left">
      {items.map((t, i) => (
        <motion.li
          key={t}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.28 + i * 0.06, duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="flex items-start gap-2.5"
        >
          <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-accent/15 text-accent">
            <Check size={10} weight="bold" aria-hidden />
          </span>
          <span className="text-meta leading-snug text-ink-2">{t}</span>
        </motion.li>
      ))}
    </ul>
  );
}

export function IntroCarousel({
  authDisabled = false,
  googleClientId,
}: {
  authDisabled?: boolean;
  googleClientId?: string | null;
}) {
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
  const Visual = slide?.visual;

  return (
    <MotionConfig reducedMotion="user">
      <main className="flex min-h-[100dvh] flex-col bg-ground px-5 pb-7 pt-4 text-ink">
        <div className="flex h-9 shrink-0 items-center justify-between">
          <BrandMark size={26} accent />
          {!last && (
            <Button variant="ghost" size="sm" onClick={finish} className="text-ink-3">
              Saltar
            </Button>
          )}
        </div>

        <div className="relative flex-1 overflow-hidden">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={last ? "entrar" : slide!.key}
              custom={direction}
              initial={{ opacity: 0, x: direction * 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: direction * -40 }}
              transition={{ duration: 0.22, ease: [0.2, 0, 0, 1] }}
              // Deslizar con el dedo, que es como se pasa una bienvenida en
              // un teléfono. Los puntos de abajo y el botón hacen lo mismo
              // para quien no arrastra.
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.18}
              onDragEnd={(_, info) => {
                if (info.offset.x < -60) go(index + 1);
                else if (info.offset.x > 60) go(index - 1);
              }}
              // **`absolute inset-0` y no `h-full`**: la lámina es hija de
              // un `AnimatePresence`, y ahí `h-full` se queda en la altura
              // del contenido.
              //
              // Y **`justify-center`, no `justify-between`**: con
              // `between`, la maqueta se pegaba arriba y el texto abajo, y
              // el vacío que antes estaba en los bordes aparecía entero en
              // el medio —500px de nada entre el dibujo y su título, que es
              // peor, porque separa dos cosas que se leen juntas—. El
              // bloque va junto y centrado; lo que llena la pantalla es que
              // ahora el bloque es grande, no que esté estirado.
              className="absolute inset-0 mx-auto flex max-w-[24rem] flex-col justify-center gap-7 py-2"
            >
              {last ? (
                <>
                  <div className="flex flex-col items-center gap-3 text-center">
                    <BrandMark size={52} accent />
                    <h1 className="text-2xl font-semibold tracking-tight text-ink">
                      Entrá para empezar
                    </h1>
                    <p className="text-balance text-meta leading-relaxed text-ink-2">
                      Con tu cuenta de Google. No se guarda ninguna contraseña.
                    </p>
                  </div>

                  <div className="flex flex-col gap-5">
                    {/* La casilla y su etiqueta a la izquierda: centradas se
                        leen torcidas, y así queda igual que /entrar. */}
                    <div className="w-full text-left">
                      <GoogleSignIn disabled={authDisabled} googleClientId={googleClientId} />
                    </div>

                    <div className="w-full border-t border-line pt-4">
                      <Puntos
                        items={[
                          "Solo pedimos tu nombre y tu correo",
                          "Tus movimientos no se comparten con nadie",
                          "Podés borrar la cuenta y todo lo anotado",
                        ]}
                      />
                    </div>
                  </div>
                </>
              ) : (
                <>
                  {/* El dibujo no se arrastra: sin esto, empezar el gesto
                      encima de la tarjeta la selecciona en vez de pasar. */}
                  <div className="pointer-events-none select-none">
                    {Visual ? <Visual /> : null}
                  </div>

                  {/* Título, bajada y puntos van juntos: separarlos con el
                      `justify-between` los habría desparramado. */}
                  <div className="flex flex-col gap-3">
                    <h1 className="text-balance text-[1.6rem] font-semibold leading-tight tracking-tight text-ink">
                      {slide!.title}
                    </h1>
                    <p className="text-balance text-meta leading-relaxed text-ink-2">
                      {slide!.body}
                    </p>
                    <div className="mt-1 border-t border-line pt-3">
                      <Puntos items={slide!.points} />
                    </div>
                  </div>
                </>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="flex shrink-0 flex-col items-center gap-5">
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
              className="h-11 w-full max-w-[24rem]"
              onClick={() => (index === TOTAL - 2 ? finish() : go(index + 1))}
            >
              {index === TOTAL - 2 ? "Entrar" : "Siguiente"}
              <ArrowRight size={16} />
            </Button>
          )}
        </div>
      </main>
    </MotionConfig>
  );
}
