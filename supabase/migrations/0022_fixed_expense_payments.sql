-- Marcar un gasto fijo como pagado ahora puede registrar el movimiento real
-- en la cuenta vinculada, para que el saldo de la billetera refleje la
-- salida de plata.
--
-- Hasta hoy `fixed_expenses.account_id` se guardaba y no se usaba para nada:
-- marcabas el alquiler como pagado y el saldo de la cuenta quedaba intacto,
-- así que el número de la app se alejaba del banco un poco más cada mes.
--
-- Correr después de 0021_phase3_debts_receipts_push.sql.

-- El movimiento que generó un gasto fijo queda marcado como tal.
--
-- Hace falta para no contar el mismo gasto dos veces: el resumen hace
-- ingresos − fijos − variables, y los topes por categoría miden movimientos
-- MÁS gastos fijos. Sin esta marca, el alquiler pagado sumaría por los dos
-- lados. Con ella, los movimientos de un fijo se excluyen de "variables" en
-- todos lados, pero siguen contando para el saldo de la cuenta (que es
-- justo el punto) y se ven en la lista de movimientos.
alter table public.transactions
  add column fixed_expense_id uuid references public.fixed_expenses (id) on delete set null;

comment on column public.transactions.fixed_expense_id is
  'Gasto fijo que originó este movimiento. No cuenta como gasto variable.';

create index transactions_fixed_expense_idx on public.transactions (fixed_expense_id);
