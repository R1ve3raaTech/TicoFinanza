import type { Account, AccountType } from "./types";

export const ACCOUNT_TYPES: { value: AccountType; label: string; hint: string }[] = [
  { value: "efectivo", label: "Efectivo", hint: "La plata que andás encima" },
  { value: "debito", label: "Débito", hint: "Cuenta corriente o de planilla" },
  { value: "credito", label: "Crédito", hint: "Tarjeta: el saldo suele ser negativo" },
  { value: "ahorro", label: "Ahorro", hint: "Lo que no se toca todos los días" },
];

const LABELS: Record<AccountType, string> = {
  efectivo: "Efectivo",
  debito: "Débito",
  credito: "Crédito",
  ahorro: "Ahorro",
};

export function accountTypeLabel(type: AccountType): string {
  return LABELS[type];
}

/**
 * Patrimonio: la suma de todas las cuentas.
 *
 * Una tarjeta de crédito con deuda tiene saldo negativo y resta, que es lo
 * correcto — "cuánto tengo" no es lo mismo que "cuánto hay en la cuenta de
 * ahorros".
 */
export function totalBalance(accounts: Account[]): number {
  return accounts.reduce((sum, account) => sum + account.current_balance, 0);
}

/** Nombre de cuenta por id, para listas y exportaciones. */
export function accountNames(accounts: Account[]): Map<string, string> {
  return new Map(accounts.map((a) => [a.id, a.name]));
}
