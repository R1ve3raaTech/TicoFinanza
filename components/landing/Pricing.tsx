import { CreditCard, HandCoins, ShieldCheck } from "@phosphor-icons/react/dist/ssr";
import { Reveal } from "./Reveal";

/**
 * "¿Es gratis y cuál es la trampa?" es la primera pregunta de cualquiera que
 * entra, y la landing no la contestaba en ningún lado. Se responde de frente,
 * incluida la parte incómoda (no hay plan pago hoy, y si algún día lo hay se
 * avisa antes) — esconderlo es lo que hace que un producto de plata se sienta
 * sospechoso.
 */
const promises = [
  {
    icon: CreditCard,
    title: "Sin tarjeta",
    body: "No se pide ningún medio de pago para entrar ni para usarla.",
  },
  {
    icon: HandCoins,
    title: "Sin vender tus datos",
    body: "El modelo no es tu información. Tus movimientos no se le pasan a nadie.",
  },
  {
    icon: ShieldCheck,
    title: "Sin letra chiquita",
    body: "Si algún día hay un plan pago, se avisa antes y lo que ya usás no se cierra de un día para otro.",
  },
];

export function Pricing() {
  return (
    <div className="flex flex-col items-center text-center">
      <Reveal className="flex flex-col items-center">
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-ink-3">Precio</p>
        {/* Misma escala/peso que la cifra grande del dashboard (saldo): el
            precio es el otro momento de la landing que merece un número
            protagonista. */}
        <p className="mt-4 text-[3rem] font-semibold leading-none tracking-[-0.03em] text-ink sm:text-[3.5rem]">
          Gratis
        </p>
        <p className="mt-5 max-w-[44ch] text-sm leading-relaxed text-ink-2 sm:text-base">
          TicoFinanza no cobra nada hoy. Es un proyecto hecho en Costa Rica, para resolver un
          problema que el que lo hizo también tenía.
        </p>
      </Reveal>

      <Reveal delay={0.1} className="mt-10 flex w-full max-w-3xl flex-wrap items-start justify-center gap-x-10 gap-y-6">
        {promises.map((promise) => (
          <div key={promise.title} className="flex max-w-[230px] flex-col items-center gap-1.5">
            <promise.icon size={18} weight="bold" className="text-ink-2" />
            <h3 className="text-sm font-medium text-ink">{promise.title}</h3>
            <p className="text-sm leading-relaxed text-ink-3">{promise.body}</p>
          </div>
        ))}
      </Reveal>
    </div>
  );
}
