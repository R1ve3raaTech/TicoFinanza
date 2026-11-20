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

/**
 * Cuánto pesa cada cuenta dentro del total, 0–1.
 *
 * Solo cuentan las positivas: una tarjeta de crédito con deuda resta del
 * patrimonio, y una barra "negativa" no significa nada. El reparto se mide
 * contra la suma de lo que hay, no contra el patrimonio neto — si no, con
 * una deuda grande las barras pasarían de 100 %.
 */
export function accountShare(account: Account, accounts: Account[]): number {
  const positivo = accounts.reduce((sum, a) => sum + Math.max(a.current_balance, 0), 0);
  if (positivo <= 0 || account.current_balance <= 0) return 0;
  return account.current_balance / positivo;
}
