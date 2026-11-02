-- Ingresos fijos (salario, quincena, pensión) y metas que se repiten todos
-- los años (marchamo, seguros, impuestos municipales).
--
-- Las dos cosas van en la misma migración para correr una sola vez.
--
-- Correr después de 0022_fixed_expense_payments.sql.

-- ---------------------------------------------------------------------------
-- 1. Ingresos fijos
-- ---------------------------------------------------------------------------
-- Tabla aparte de `fixed_expenses` y no una columna `type` en ella: los dos
-- se parecen en la forma (monto, día del mes, cuenta) pero no en el
-- comportamiento. Un gasto fijo vencido es una deuda y se pinta en rojo; un
-- ingreso que no llegó es una preocupación distinta. Mezclarlos obligaría a
-- cada consulta y cada pantalla a filtrar por el tipo, y con el tiempo
-- alguna se olvidaría.
create table public.fixed_incomes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  amount numeric(14, 2) not null check (amount > 0),
  currency text not null default 'CRC' check (currency = 'CRC'),
  category text,
  -- Día del mes en que entra. 31 se recorta al último día del mes, igual
  -- que en los gastos fijos (ver chargeDayKey en lib/fixedExpenses.ts).
  pay_day int not null check (pay_day between 1 and 31),
  -- Una quincena es el mismo ingreso dos veces al mes: con un segundo día
  -- se resuelve sin crear dos filas que haya que mantener a la par.
  second_pay_day int check (second_pay_day between 1 and 31),
  account_id uuid references public.accounts (id) on delete set null,
  -- Mismo par estado + mes que los gastos fijos: "confirmado" vale solo
  -- para el mes que dice `status_month`, así el ciclo se reinicia solo.
  status text not null default 'PENDING' check (status in ('PENDING', 'CONFIRMED')),
  status_month text check (status_month ~ '^\d{4}-\d{2}$'),
  created_at timestamptz not null default now()
);

create index fixed_incomes_user_idx on public.fixed_incomes (user_id, pay_day);

alter table public.fixed_incomes enable row level security;

create policy "Los usuarios ven sus ingresos fijos"
  on public.fixed_incomes for select using (auth.uid() = user_id);
create policy "Los usuarios crean sus ingresos fijos"
  on public.fixed_incomes for insert with check (auth.uid() = user_id);
create policy "Los usuarios actualizan sus ingresos fijos"
  on public.fixed_incomes for update using (auth.uid() = user_id);
create policy "Los usuarios eliminan sus ingresos fijos"
  on public.fixed_incomes for delete using (auth.uid() = user_id);

-- El movimiento que generó confirmar un ingreso fijo, para no contarlo dos
-- veces y para poder deshacerlo. Mismo patrón que `fixed_expense_id`.
alter table public.transactions
  add column fixed_income_id uuid references public.fixed_incomes (id) on delete set null;

comment on column public.transactions.fixed_income_id is
  'Ingreso fijo que originó este movimiento, al confirmarlo.';

create index transactions_fixed_income_idx on public.transactions (fixed_income_id);

-- ---------------------------------------------------------------------------
-- 2. Metas anuales (marchamo, seguros, impuestos)
-- ---------------------------------------------------------------------------
-- El prorrateo NO es un módulo nuevo: una meta de ahorro ya tiene monto
-- objetivo, fecha y ritmo mensual calculado (lib/goals.ts). Lo único que le
-- faltaba era repetirse todos los años. Un módulo paralelo sería la tercera
-- forma de apartar plata en la misma app.
alter table public.savings_goals
  add column recurrence text not null default 'una-vez'
    check (recurrence in ('una-vez', 'anual'));

comment on column public.savings_goals.recurrence is
  'anual: al completarse, la fecha objetivo salta un año y el apartado vuelve a cero.';

-- Cuántas veces ya se cumplió el ciclo. Sirve para mostrar "3.º año" y para
-- saber que una meta anual completada no es una meta terminada.
alter table public.savings_goals
  add column cycles_completed int not null default 0 check (cycles_completed >= 0);
