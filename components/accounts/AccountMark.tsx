import { Bank, CreditCard, Money as Billete, PiggyBank } from "@phosphor-icons/react/dist/ssr";
import type { Icon } from "@phosphor-icons/react";
import { MATERIAL_SYMBOLS } from "@/lib/materialSymbols";
import type { Account, AccountType } from "@/lib/types";

/**
 * Ícono por tipo, el de siempre. Es lo que se dibuja mientras la cuenta no
 * tenga uno propio elegido.
 */
const BY_TYPE: Record<AccountType, Icon> = {
  efectivo: Billete,
  debito: Bank,
  credito: CreditCard,
  ahorro: PiggyBank,
};

/**
 * La marquita de una cuenta: su ícono sobre un cuadrito.
 *
 * El ícono propio (columna `icon`, migración 0030) gana sobre el del tipo.
 * Hace falta porque con dos cuentas del mismo tipo —la del banco y la de la
 * planilla— el ícono del tipo las dibujaba iguales, y entonces no servía
 * para distinguirlas, que es para lo que está.
 *
 * Tolerante a propósito: si la migración no se corrió, `icon` llega
 * `undefined` y se cae al ícono del tipo, sin romper nada.
 */
export function AccountMark({
  account,
  size = 32,
  className = "",
}: {
  account: Pick<Account, "type"> & { icon?: string | null };
  size?: number;
  className?: string;
}) {
  const symbol = account.icon ? MATERIAL_SYMBOLS[account.icon] : undefined;
  const Fallback = BY_TYPE[account.type];

  return (
    <span
      // El nombre de la cuenta siempre está escrito al lado: anunciarlo dos
      // veces solo alarga la fila para quien la escucha.
      aria-hidden
      style={{ width: size, height: size }}
      className={`flex shrink-0 items-center justify-center rounded-control bg-surface-raised text-ink-3 ${className}`}
    >
      {symbol ? (
        <svg
          viewBox="0 -960 960 960"
          width={Math.round(size * 0.58)}
          height={Math.round(size * 0.58)}
          fill="currentColor"
        >
          <path d={symbol.path} />
        </svg>
      ) : (
        <Fallback size={Math.round(size * 0.5)} weight="fill" />
      )}
    </span>
  );
}
