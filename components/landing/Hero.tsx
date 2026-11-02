import { CloudSlash, DeviceMobile, LockKey, ShieldCheck } from "@phosphor-icons/react/dist/ssr";
import { HeroMockup } from "./HeroMockup";
import { InstallCta } from "./InstallCta";
import { LoginButton } from "./LoginButton";

/**
 * Las cuatro cosas que alguien quiere saber antes de dar el clic, en el
 * mismo lugar donde duda. Dos son objeciones (cuánto cuesta, qué le doy) y
 * dos son capacidades que antes no existían y nadie adivinaría.
 */
const FACTS = [
  { icon: ShieldCheck, text: "Gratis, sin tarjeta" },
  { icon: LockKey, text: "No conectamos tu banco ni tu correo" },
  { icon: CloudSlash, text: "Funciona sin señal" },
  { icon: DeviceMobile, text: "Android o desde el navegador" },
];

export function Hero({ loggedIn = false }: { loggedIn?: boolean }) {
  return (
    <section className="relative overflow-hidden">
      {/* Un solo resplandor, quieto y muy tenue, detrás de la captura.
          Da profundidad sin volver la portada un sitio de software: el
          rediseño del 2026-09-14 sacó a propósito el acento decorativo y
          el movimiento repetido. */}
      <div
        aria-hidden
        className="pointer-events-none absolute right-[-10%] top-[-20%] h-[34rem] w-[34rem] rounded-full bg-accent/[0.07] blur-[130px]"
      />

      <div className="relative mx-auto grid w-full max-w-6xl items-center gap-10 px-4 pb-14 pt-14 sm:px-6 md:min-h-[calc(100dvh-64px)] md:grid-cols-[1.1fr_1fr] md:gap-14 md:pb-16 md:pt-0">
        <div className="relative flex flex-col items-start gap-6">
          {/* Misma escala del número protagonista del dashboard (--text-display),
              escrita a mano acá para no arrastrar el peso/tracking del token
              (pensado para cifras tabulares, no para un título). */}
          <h1 className="animate-fade-up text-balance text-[2.5rem] font-semibold leading-[1.05] tracking-[-0.035em] text-ink sm:text-[3rem] md:text-[3.75rem] lg:text-[4.25rem] [animation-delay:80ms]">
            Sabé qué se te viene este mes
          </h1>

          <p className="animate-fade-up max-w-[46ch] text-base leading-relaxed text-ink-2 md:text-lg [animation-delay:160ms]">
            Anotá tus gastos fijos con su día de cobro y tus ingresos y gastos del día a día.
            TicoFinanza te dice qué vence primero, en qué se te va la plata y cuánto queda. Todo en
            colones.
          </p>

          <div className="animate-fade-up flex flex-col items-start gap-4 [animation-delay:240ms]">
            <div className="flex flex-wrap items-center gap-3">
              <LoginButton large loggedIn={loggedIn} />
              <InstallCta />
            </div>

            {/* Ancho acotado para que envuelvan dos y dos: sueltas, en
                escritorio quedaban tres arriba y una huérfana abajo. */}
            <ul className="flex max-w-[26rem] flex-wrap items-center gap-x-5 gap-y-2 text-xs text-ink-3">
              {FACTS.map(({ icon: Icon, text }) => (
                <li key={text} className="inline-flex items-center gap-1.5">
                  <Icon size={14} weight="bold" aria-hidden className="shrink-0 text-accent" />
                  {text}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* El levantado al pasar el puntero es el único gesto que se
            agregó: responde a algo que la persona hace, no se repite solo.
            Con movimiento reducido no pasa nada. */}
        <div className="animate-fade-up relative flex justify-start transition-transform duration-500 [animation-delay:320ms] hover:-translate-y-1 motion-reduce:transition-none motion-reduce:hover:translate-y-0 md:justify-end">
          <HeroMockup />
        </div>
      </div>
    </section>
  );
}
