import { LockKey, ShieldCheck } from "@phosphor-icons/react/dist/ssr";
import { LoginButton } from "./LoginButton";
import { MockupPreview } from "./MockupPreview";

export function Hero({ loggedIn = false }: { loggedIn?: boolean }) {
  return (
    <section className="relative overflow-hidden">
      <div className="relative mx-auto grid w-full max-w-6xl items-center gap-12 px-4 pb-20 pt-16 sm:px-6 md:min-h-[calc(100dvh-68px)] md:grid-cols-[1.1fr_1fr] md:gap-16 md:pb-24 md:pt-0">
        <div className="relative flex flex-col items-center gap-7 text-center md:items-start md:text-left">
          <h1 className="animate-fade-up text-balance font-montserrat text-[2.75rem] font-bold leading-[0.98] tracking-tighter text-ink md:text-7xl [animation-delay:90ms]">
            Controlá tus finanzas sin mover un solo dedo
          </h1>

          <p className="animate-fade-up max-w-[46ch] text-base leading-relaxed text-ink-2 md:text-lg [animation-delay:180ms]">
            TicoFinanza se conecta a tu Gmail y lee las notificaciones que tu banco ya te manda por
            correo, para registrar tus ingresos y gastos automáticamente — sin anotar nada a mano.
          </p>

          <div className="animate-fade-up flex flex-col items-center gap-4 md:items-start [animation-delay:270ms]">
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
                Nunca pedimos la clave de tu banco
              </span>
            </div>
          </div>
        </div>

        <div className="animate-fade-up relative flex justify-center [animation-delay:360ms] md:justify-end">
          <MockupPreview />
        </div>
      </div>
    </section>
  );
}
