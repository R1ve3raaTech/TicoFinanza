-- Cuentas (billeteras), transferencias internas, presupuestos por categoría
-- y metas de ahorro. Nada de lo que ya existe cambia de forma: a
-- `transactions` y `fixed_expenses` solo se les agrega `account_id`, que
-- puede quedar en null (movimiento sin cuenta asignada).
--
-- Correr después de 0019_manual_tracker.sql.

-- ---------------------------------------------------------------------------
-- 1. Cuentas
-- ---------------------------------------------------------------------------
create table public.accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  type text not null check (type in ('efectivo', 'debito', 'credito', 'ahorro')),
  -- Lo que tenía la cuenta el día que se creó en la app. El saldo de hoy sale
  -- de acá más todo lo que se registró después (ver refresh_account_balance).
  initial_balance numeric(14, 2) not null default 0,
  current_balance numeric(14, 2) not null default 0,
  currency text not null default 'CRC' check (currency = 'CRC'),
  created_at timestamptz not null default now()
);

create index accounts_user_idx on public.accounts (user_id, created_at);

alter table public.accounts enable row level security;

create policy "Los usuarios ven sus cuentas"
  on public.accounts for select using (auth.uid() = user_id);
create policy "Los usuarios crean sus cuentas"
  on public.accounts for insert with check (auth.uid() = user_id);
create policy "Los usuarios actualizan sus cuentas"
  on public.accounts for update using (auth.uid() = user_id);
create policy "Los usuarios eliminan sus cuentas"
  on public.accounts for delete using (auth.uid() = user_id);

-- Si se borra una cuenta, los movimientos no se borran con ella: quedan sin
-- cuenta asignada. Perder el historial de gastos por cerrar una tarjeta
-- sería mucho peor que tener movimientos huérfanos.
alter table public.transactions
  add column account_id uuid references public.accounts (id) on delete set null;

alter table public.fixed_expenses
  add column account_id uuid references public.accounts (id) on delete set null;

create index transactions_account_idx on public.transactions (account_id);

-- ---------------------------------------------------------------------------
-- 2. Transferencias internas
-- ---------------------------------------------------------------------------
-- Tabla aparte y no un tercer `type` en `transactions`: mover plata de débito
-- a efectivo no es ni ingreso ni gasto, y mezclarla ahí haría que cada
-- consulta de totales, el superávit neto y los gráficos tuvieran que
-- acordarse de excluirla. Separada, es imposible que se cuele.
create table public.transfers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  from_account_id uuid not null references public.accounts (id) on delete cascade,
  to_account_id uuid not null references public.accounts (id) on delete cascade,
  amount numeric(14, 2) not null check (amount > 0),
  description text,
  transfer_date timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint transfers_distinct_accounts check (from_account_id <> to_account_id)
);

create index transfers_user_date_idx on public.transfers (user_id, transfer_date desc);

alter table public.transfers enable row level security;

create policy "Los usuarios ven sus transferencias"
  on public.transfers for select using (auth.uid() = user_id);
create policy "Los usuarios crean sus transferencias"
  on public.transfers for insert with check (auth.uid() = user_id);
create policy "Los usuarios actualizan sus transferencias"
  on public.transfers for update using (auth.uid() = user_id);
create policy "Los usuarios eliminan sus transferencias"
  on public.transfers for delete using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- 3. Presupuestos por categoría y por mes
-- ---------------------------------------------------------------------------
-- `month_year` ("YYYY-MM") en vez de un límite fijo para siempre: un mes con
-- vacaciones no tiene el mismo tope que uno normal, y guardar el mes deja el
-- historial de lo que uno se propuso en cada uno.
create table public.budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  category_name text not null,
  monthly_limit numeric(14, 2) not null check (monthly_limit > 0),
  month_year text not null check (month_year ~ '^\d{4}-\d{2}$'),
  created_at timestamptz not null default now(),
  unique (user_id, category_name, month_year)
);

create index budgets_user_month_idx on public.budgets (user_id, month_year);

alter table public.budgets enable row level security;

create policy "Los usuarios ven sus presupuestos"
  on public.budgets for select using (auth.uid() = user_id);
create policy "Los usuarios crean sus presupuestos"
  on public.budgets for insert with check (auth.uid() = user_id);
create policy "Los usuarios actualizan sus presupuestos"
  on public.budgets for update using (auth.uid() = user_id);
create policy "Los usuarios eliminan sus presupuestos"
  on public.budgets for delete using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- 4. Metas de ahorro y sus abonos
-- ---------------------------------------------------------------------------
create table public.savings_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  target_amount numeric(14, 2) not null check (target_amount > 0),
  -- Lo abonado hasta hoy. Lo mantiene al día refresh_goal_amount() a partir
  -- de goal_contributions; no se escribe a mano desde la app.
  current_amount numeric(14, 2) not null default 0,
  target_date date,
  -- Color de la meta. Celeste/índigo/violeta/neutro a propósito: verde, rosa
  -- y ámbar están reservados para ingreso, gasto y alerta en toda la app.
  color text not null default 'celeste'
    check (color in ('celeste', 'indigo', 'violeta', 'neutro')),
  created_at timestamptz not null default now()
);

create index savings_goals_user_idx on public.savings_goals (user_id, created_at);

alter table public.savings_goals enable row level security;

create policy "Los usuarios ven sus metas"
  on public.savings_goals for select using (auth.uid() = user_id);
create policy "Los usuarios crean sus metas"
  on public.savings_goals for insert with check (auth.uid() = user_id);
create policy "Los usuarios actualizan sus metas"
  on public.savings_goals for update using (auth.uid() = user_id);
create policy "Los usuarios eliminan sus metas"
  on public.savings_goals for delete using (auth.uid() = user_id);

-- Un abono mueve plata de una cuenta a la meta. Es lo mismo que una
-- transferencia, pero con la meta del otro lado: tampoco es un gasto.
create table public.goal_contributions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  goal_id uuid not null references public.savings_goals (id) on delete cascade,
  account_id uuid references public.accounts (id) on delete set null,
  amount numeric(14, 2) not null check (amount > 0),
  created_at timestamptz not null default now()
);

create index goal_contributions_goal_idx on public.goal_contributions (goal_id, created_at desc);
create index goal_contributions_account_idx on public.goal_contributions (account_id);

alter table public.goal_contributions enable row level security;

create policy "Los usuarios ven sus abonos"
  on public.goal_contributions for select using (auth.uid() = user_id);
create policy "Los usuarios crean sus abonos"
  on public.goal_contributions for insert with check (auth.uid() = user_id);
create policy "Los usuarios eliminan sus abonos"
  on public.goal_contributions for delete using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- 5. Saldos al día, calculados en la base
-- ---------------------------------------------------------------------------
-- El saldo de una cuenta se recalcula entero (no se suma/resta el delta) cada
-- vez que cambia algo que lo afecta. Es más trabajo para Postgres, pero con
-- los volúmenes de una app de finanzas personales no se nota y a cambio es
-- imposible que el saldo quede desfasado: una edición, un borrado o un
-- cambio de cuenta de un movimiento viejo dan siempre el número correcto.
create or replace function public.refresh_account_balance(target uuid)
returns void
language plpgsql
security definer set search_path = ''
as $$
begin
  if target is null then
    return;
  end if;

  update public.accounts a
  set current_balance =
    a.initial_balance
    + coalesce((
        select sum(case when t.type = 'INCOME' then t.amount else -t.amount end)
        from public.transactions t where t.account_id = a.id
      ), 0)
    + coalesce((
        select sum(tr.amount) from public.transfers tr where tr.to_account_id = a.id
      ), 0)
    - coalesce((
        select sum(tr.amount) from public.transfers tr where tr.from_account_id = a.id
      ), 0)
    - coalesce((
        select sum(gc.amount) from public.goal_contributions gc where gc.account_id = a.id
      ), 0)
  where a.id = target;
end;
$$;

create or replace function public.refresh_goal_amount(target uuid)
returns void
language plpgsql
security definer set search_path = ''
as $$
begin
  if target is null then
    return;
  end if;

  update public.savings_goals g
  set current_amount = coalesce(
    (select sum(gc.amount) from public.goal_contributions gc where gc.goal_id = g.id), 0
  )
  where g.id = target;
end;
$$;

-- Movimientos y abonos: una sola cuenta involucrada (`account_id`).
create or replace function public.sync_account_balance()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  if tg_op in ('UPDATE', 'DELETE') then
    perform public.refresh_account_balance(old.account_id);
  end if;
  if tg_op in ('INSERT', 'UPDATE') then
    perform public.refresh_account_balance(new.account_id);
  end if;
  return null;
end;
$$;

-- Transferencias: dos cuentas, y las dos pueden cambiar en una edición.
create or replace function public.sync_transfer_balances()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  if tg_op in ('UPDATE', 'DELETE') then
    perform public.refresh_account_balance(old.from_account_id);
    perform public.refresh_account_balance(old.to_account_id);
  end if;
  if tg_op in ('INSERT', 'UPDATE') then
    perform public.refresh_account_balance(new.from_account_id);
    perform public.refresh_account_balance(new.to_account_id);
  end if;
  return null;
end;
$$;

create or replace function public.sync_goal_amount()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  if tg_op in ('UPDATE', 'DELETE') then
    perform public.refresh_goal_amount(old.goal_id);
  end if;
  if tg_op in ('INSERT', 'UPDATE') then
    perform public.refresh_goal_amount(new.goal_id);
  end if;
  return null;
end;
$$;

create trigger transactions_sync_balance
  after insert or update or delete on public.transactions
  for each row execute function public.sync_account_balance();

create trigger transfers_sync_balance
  after insert or update or delete on public.transfers
  for each row execute function public.sync_transfer_balances();

create trigger goal_contributions_sync_balance
  after insert or update or delete on public.goal_contributions
  for each row execute function public.sync_account_balance();

create trigger goal_contributions_sync_goal
  after insert or update or delete on public.goal_contributions
  for each row execute function public.sync_goal_amount();

-- Cambiar el saldo inicial también mueve el actual. `update of
-- initial_balance` no se vuelve a disparar por el update de arriba, que solo
-- toca `current_balance`.
create or replace function public.sync_own_account_balance()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  perform public.refresh_account_balance(new.id);
  return null;
end;
$$;

create trigger accounts_sync_balance
  after insert or update of initial_balance on public.accounts
  for each row execute function public.sync_own_account_balance();

-- ---------------------------------------------------------------------------
-- 6. Cuenta por defecto
-- ---------------------------------------------------------------------------
-- Cada cuenta nueva arranca con una billetera de efectivo, para que el primer
-- movimiento tenga dónde caer sin obligar a configurar nada antes.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'avatar_url'
  );

  insert into public.accounts (user_id, name, type)
  values (new.id, 'Efectivo', 'efectivo');

  return new;
end;
$$;

-- Lo mismo para quien ya tenía cuenta antes de esta migración: una billetera
-- de efectivo con saldo inicial 0, y los movimientos que ya existían quedan
-- asignados a ella. Si el saldo inicial real no era 0, se corrige desde la
-- app (Resumen → la cuenta → Saldo inicial).
insert into public.accounts (user_id, name, type)
select p.id, 'Efectivo', 'efectivo'
from public.profiles p
where not exists (select 1 from public.accounts a where a.user_id = p.id);

-- La cuenta más vieja de cada usuario, que para quien venía de antes es la
-- de efectivo recién creada (es la única que tiene).
with primera_cuenta as (
  select distinct on (user_id) user_id, id
  from public.accounts
  order by user_id, created_at, id
)
update public.transactions t
set account_id = c.id
from primera_cuenta c
where c.user_id = t.user_id and t.account_id is null;

with primera_cuenta as (
  select distinct on (user_id) user_id, id
  from public.accounts
  order by user_id, created_at, id
)
update public.fixed_expenses f
set account_id = c.id
from primera_cuenta c
where c.user_id = f.user_id and f.account_id is null;

-- Deja todos los saldos al día (los updates de arriba ya dispararon los
-- triggers, pero esto cubre también las cuentas sin movimientos).
select public.refresh_account_balance(id) from public.accounts;
