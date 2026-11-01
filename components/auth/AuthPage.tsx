import Link from "next/link";
import { CalendarCheck, ChartDonut, ListChecks } from "@phosphor-icons/react/dist/ssr";
import { HeroMockup } from "@/components/landing/HeroMockup";
import { Logo } from "@/components/Logo";
import { AUTH_CONFIGURATION_ERROR, getSupabaseConfig } from "@/lib/supabase/config";
import { GoogleSignIn } from "./GoogleSignIn";
import { IdleNoticeDialog } from "./IdleNoticeDialog";

const POINTS = [
  {
    icon: ListChecks,
    title: "Tus gastos fijos, con su día de cobro",
    body: "Marcás pagado y el mes siguiente vuelve a empezar.",
  },
  {
    icon: CalendarCheck,
    title: "Qué se vence primero",
    body: "Ordenados por fecha, con el calendario del mes.",
  },
  {
    icon: ChartDonut,
    title: "En qué se te va la plata",
    body: "Ingresos, fijos, variables y lo que queda.",
  },
];

/**
 * Pantalla de entrada.
 *
 * El panel derecho muestra el producto, no una lista de promesas: la
 * pregunta de quien está por entrar es "¿qué voy a ver adentro?", y la
 * tarjeta del resumen la contesta mejor que tres párrafos. Es la misma
 * pieza que usa la landing, así que lo que se promete y lo que se abre son
 * literalmente lo mismo.
 *
 * La entrada va escalonada con `animate-fade-up` (la utilidad que ya existe
 * en globals.css y que respeta `prefers-reduced-motion`): una sola
 * secuencia al cargar, nada que se repita ni que responda al scroll.
 */
export function AuthPage({
  initialError,
  signOutWarning,
  idleNotice,
}: {
  initialError?: string;
  signOutWarning?: boolean;
  /** La sesión se cerró sola por inactividad. */
  idleNotice?: boolean;
}) {
  const configured = Boolean(getSupabaseConfig());

  return (
    <main className="grid min-h-[100dvh] bg-ground lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
      {idleNotice && <IdleNoticeDialog />}

      <div className="flex flex-col justify-center px-6 py-14 sm:px-10 lg:px-14 xl:px-20">
        <div className="mx-auto flex w-full max-w-[26rem] flex-col">
          <Link
            href="/"
            aria-label="TicoFinanza, ir al inicio"
            className="animate-fade-up mb-12 w-fit rounded-control"
          >
            <Logo subtitle="finanzas personales" size="lg" accent />
          </Link>

          <h1 className="animate-fade-up text-balance text-[2rem] font-semibold leading-[1.1] tracking-[-0.03em] text-ink [animation-delay:70ms] sm:text-[2.25rem]">
            Entrá a tu cuenta
          </h1>
          <p className="animate-fade-up mt-3 text-sm leading-relaxed text-ink-2 [animation-delay:130ms]">
            Con tu cuenta de Google. Sin contraseñas que recordar, y sin acceso a tus correos ni a
            tu banco.
          </p>

          <div className="animate-fade-up mt-8 [animation-delay:190ms]">
            <GoogleSignIn
              disabled={!configured}
              initialError={configured ? initialError : AUTH_CONFIGURATION_ERROR}
              signOutWarning={signOutWarning}
            />
          </div>

          <p className="animate-fade-up mt-8 border-t border-line pt-6 text-meta leading-relaxed text-ink-3 [animation-delay:250ms]">
            Solo usamos tu nombre, tu correo y tu foto de perfil para identificarte.
          </p>

          {/* En teléfono el panel de la derecha no se muestra, así que acá va
              lo mínimo para saber qué hay adentro. */}
          <ul className="animate-fade-up mt-5 flex flex-col gap-2 [animation-delay:310ms] lg:hidden">
            {POINTS.map((point) => (
              <li key={point.title} className="flex items-start gap-2.5 text-meta text-ink-3">
                <point.icon size={14} aria-hidden className="mt-0.5 shrink-0" />
                {point.title}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <aside
        aria-label="Qué vas a encontrar adentro"
        className="relative hidden overflow-hidden border-l border-line bg-surface lg:flex lg:flex-col lg:justify-center lg:px-14 xl:px-20"
      >
        <div className="w-full max-w-lg">
          <p className="animate-fade-up text-[1.375rem] font-semibold leading-snug tracking-[-0.02em] text-ink [animation-delay:160ms]">
            Lo que entra, lo que sale y lo que se viene.
          </p>
          <p className="animate-fade-up mt-2 max-w-[44ch] text-sm leading-relaxed text-ink-3 [animation-delay:220ms]">
            Un registro manual, sin conectar bancos ni correos: vos anotás, la app lleva la cuenta.
          </p>

          <div className="animate-fade-up mt-9 [animation-delay:300ms]">
            <HeroMockup />
          </div>

          <ul className="animate-fade-up mt-9 grid gap-x-8 gap-y-4 [animation-delay:380ms] xl:grid-cols-2">
            {POINTS.map((point) => (
              <li key={point.title} className="flex gap-3">
                <point.icon size={16} aria-hidden className="mt-0.5 shrink-0 text-ink-3" />
                <div className="min-w-0">
                  <p className="text-label text-ink">{point.title}</p>
                  <p className="mt-0.5 text-meta leading-relaxed text-ink-3">{point.body}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </aside>
    </main>
  );
}
