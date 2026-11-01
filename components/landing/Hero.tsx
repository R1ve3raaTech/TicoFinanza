import { LockKey, ShieldCheck } from "@phosphor-icons/react/dist/ssr";
import { HeroMockup } from "./HeroMockup";
import { LoginButton } from "./LoginButton";

export function Hero({ loggedIn = false }: { loggedIn?: boolean }) {
  return (
    <section className="relative overflow-hidden">
      <div className="relative mx-auto grid w-full max-w-6xl items-center gap-10 px-4 pb-14 pt-14 sm:px-6 md:min-h-[calc(100dvh-64px)] md:grid-cols-[1.1fr_1fr] md:gap-14 md:pb-16 md:pt-0">
        <div className="relative flex flex-col items-center gap-6 text-center md:items-start md:text-left">
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

          <div className="animate-fade-up flex flex-col items-center gap-4 md:items-start [animation-delay:240ms]">
            <LoginButton large loggedIn={loggedIn} />

            {/* Las dos objeciones que frenan a cualquiera antes de dar el
                clic, contestadas en el mismo lugar donde dudan. */}
            <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-ink-3 md:justify-start">
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck size={14} weight="bold" className="text-accent" />
                Gratis, sin tarjeta
              </span>
              <span className="inline-flex items-center gap-1.5">
                <LockKey size={14} weight="bold" className="text-accent" />
                No conectamos tu banco ni tu correo
              </span>
            </div>
          </div>
        </div>

        <div className="animate-fade-up relative flex justify-center [animation-delay:320ms] md:justify-end">
          <HeroMockup />
        </div>
      </div>
    </section>
  );
}
