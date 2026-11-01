import type { Transaction, Transfer } from "./types";

/**
 * Una fila del libro de movimientos. Los ingresos y gastos y las
 * transferencias se guardan en tablas distintas (una transferencia no es ni
 * ingreso ni gasto), pero en pantalla van en la misma lista ordenada por
 * fecha: alguien que busca "¿cuándo saqué del cajero?" no piensa en dos
 * tablas.
 */
export type LedgerEntry =
  | { kind: "transaction"; id: string; date: string; transaction: Transaction }
  | { kind: "transfer"; id: string; date: string; transfer: Transfer };

export function buildLedger(transactions: Transaction[], transfers: Transfer[]): LedgerEntry[] {
  const entries: LedgerEntry[] = [
    ...transactions.map((transaction) => ({
      kind: "transaction" as const,
      id: transaction.id,
      date: transaction.transaction_date,
      transaction,
    })),
    ...transfers.map((transfer) => ({
      kind: "transfer" as const,
      id: transfer.id,
      date: transfer.transfer_date,
      transfer,
    })),
  ];

  return entries.sort((a, b) => b.date.localeCompare(a.date));
}

/**
 * Neto de un grupo de filas. Las transferencias suman cero a propósito: la
 * plata no entró ni salió del patrimonio, solo cambió de billetera.
 */
export function ledgerNet(entries: LedgerEntry[]): number {
  return entries.reduce((net, entry) => {
    if (entry.kind !== "transaction") return net;
    return net + (entry.transaction.type === "INCOME" ? entry.transaction.amount : -entry.transaction.amount);
  }, 0);
}
