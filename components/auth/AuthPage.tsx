import Link from "next/link";
import { CalendarCheck, ChartDonut, ListChecks } from "@phosphor-icons/react/dist/ssr";
import { Logo } from "@/components/Logo";
import { AUTH_CONFIGURATION_ERROR, getSupabaseConfig } from "@/lib/supabase/config";
import { GoogleSignIn } from "./GoogleSignIn";

const POINTS = [
  {
    icon: ListChecks,
    title: "Tus gastos fijos, con su día de cobro",
    body: "Alquiler, servicios, gimnasio, suscripciones. Marcás pagado y el mes siguiente vuelve a empezar.",
  },
  {
    icon: CalendarCheck,
    title: "Qué se vence primero",
    body: "Los próximos pagos ordenados por fecha, y el calendario del mes con los días marcados.",
  },
  {
    icon: ChartDonut,
    title: "En qué se te va la plata",
    body: "Ingresos, gastos fijos, gastos variables y lo que queda. Con el desglose por categoría.",
  },
];

/**
 * Pantalla de entrada. Una sola columna centrada en teléfono; desde lg, el
 * panel de la derecha cuenta qué hace la app —sin capturas de pantalla ni
 * tarjetas flotando sobre manchas de color.
 */
export function AuthPage({
  initialError,
  signOutWarning,
}: {
  initialError?: string;
  signOutWarning?: boolean;
}) {
  const configured = Boolean(getSupabaseConfig());

  return (
    <main className="grid min-h-[100dvh] bg-ground lg:grid-cols-2">
      <div className="flex flex-col items-center justify-center px-6 py-12 sm:px-10">
        <div className="flex w-full max-w-sm flex-col items-center">
          <Link href="/" aria-label="TicoFinanza, ir al inicio" className="mb-10 rounded-control">
            <Logo subtitle="finanzas personales" size="lg" accent />
          </Link>

          <div className="w-full text-center">
            <h1 className="text-[1.625rem] font-semibold leading-tight tracking-[-0.025em] text-ink">
              Entrá a tu cuenta
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-ink-2">
              Con tu cuenta de Google. Sin contraseñas que recordar.
            </p>
          </div>

          <div className="mt-6 w-full">
            <GoogleSignIn
              disabled={!configured}
              initialError={configured ? initialError : AUTH_CONFIGURATION_ERROR}
              signOutWarning={signOutWarning}
            />
          </div>

          <p className="mt-6 max-w-[34ch] text-center text-meta leading-relaxed text-ink-3">
            Solo usamos tu nombre, tu correo y tu foto de perfil para identificarte. No pedimos
            acceso a tus correos ni a ninguna otra cuenta.
          </p>

          <p className="mt-6 text-center text-meta leading-relaxed text-ink-3">
            Al entrar aceptás los{" "}
            <Link href="/terminos" className="underline underline-offset-4 hover:text-ink">
              términos
            </Link>{" "}
            y podés consultar la{" "}
            <Link href="/privacidad" className="underline underline-offset-4 hover:text-ink">
              política de privacidad
            </Link>
            .
          </p>
        </div>
      </div>

      <aside
        aria-label="Qué hace TicoFinanza"
        className="hidden border-l border-line bg-surface lg:flex lg:flex-col lg:justify-center lg:px-14 xl:px-20"
      >
        <div className="w-full max-w-md">
          <p className="text-[1.375rem] font-semibold leading-snug tracking-[-0.02em] text-ink">
            Lo que entra, lo que sale y lo que se viene.
          </p>
          <p className="mt-2 text-sm leading-relaxed text-ink-3">
            Un registro manual, sin conectar bancos ni correos: vos anotás, la app lleva la cuenta.
          </p>

          <ul className="mt-10 flex flex-col">
            {POINTS.map((point) => {
              const Icon = point.icon;
              return (
                <li key={point.title} className="flex gap-3.5 border-t border-line py-4">
                  <Icon size={18} aria-hidden className="mt-0.5 shrink-0 text-ink-3" />
                  <div className="min-w-0">
                    <p className="text-label text-ink">{point.title}</p>
                    <p className="mt-1 text-meta leading-relaxed text-ink-3">{point.body}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </aside>
    </main>
  );
}
