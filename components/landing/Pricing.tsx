import { CreditCard, HandCoins, ShieldCheck } from "@phosphor-icons/react/dist/ssr";

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
    <dl className="grid gap-x-8 gap-y-6 sm:grid-cols-3">
      {promises.map((promise) => (
        <div key={promise.title} className="flex flex-col gap-1.5">
          <dt className="flex items-center gap-2 text-sm font-medium text-ink">
            <promise.icon size={16} weight="bold" aria-hidden className="shrink-0 text-ink-2" />
            {promise.title}
          </dt>
          <dd className="text-sm leading-relaxed text-ink-3">{promise.body}</dd>
        </div>
      ))}
    </dl>
  );
}
