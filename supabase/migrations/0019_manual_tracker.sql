-- TicoFinanza pasa a ser un tracker de registro manual: se elimina por
-- completo la lectura de Gmail (el scope `gmail.readonly` y todo el análisis
-- de correos) y se agrega el módulo de membresías y gastos fijos.
--
-- Decisión de Camil (2026-10-31): se borra TODO lo que vino de Gmail,
-- incluidos los movimientos que se habían importado de los correos. Es
-- irreversible: correrla implica perder ese historial.
--
-- Ojo con el orden: primero se borran los datos que dependen de columnas que
-- después desaparecen.

-- 1. Movimientos importados de correos. `gmail_message_id` es la marca de
--    "esto no lo escribió el usuario, lo trajo el sync".
delete from public.transactions
  where gmail_message_id is not null or is_automated = true;

-- 2. Tokens de Gmail. Sin el scope no sirven para nada y son el dato más
--    sensible que guardaba la app (refresh tokens cifrados).
drop table if exists public.gmail_tokens;

-- 3. Columnas de la era automática. `bank_name` se va con ellas: en registro
--    manual no hay banco de origen que detectar, y mantener la columna
--    obligaba a inventarle un valor a cada movimiento nuevo.
alter table public.transactions
  drop column if exists gmail_message_id,
  drop column if exists is_automated,
  drop column if exists bank_name;

-- 4. Módulos que se descontinúan junto con el rediseño (presupuestos, metas
--    de ahorro y notificaciones push: las tres dependían del flujo
--    automático para tener sentido).
drop table if exists public.budgets;
drop table if exists public.savings_goals;
drop table if exists public.push_subscriptions;

alter table public.user_settings
  drop column if exists notifications_enabled;

-- 5. Membresías y gastos fijos: pagos que se repiten todos los meses el
--    mismo día (casa, gimnasio, servicios, suscripciones).
--
--    `status` guarda Pendiente/Pagado como pide el módulo, y `status_month`
--    dice a qué mes corresponde ese estado ("YYYY-MM"). Sin esa segunda
--    columna, un gasto marcado como pagado en enero seguiría apareciendo
--    como pagado en febrero; con ella, la app lo lee como pendiente de
--    nuevo en cuanto cambia el mes, sin ningún job que lo resetee.
create table public.fixed_expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  amount numeric(14, 2) not null check (amount > 0),
  currency text not null default 'CRC' check (currency = 'CRC'),
  category text,
  charge_day int not null check (charge_day between 1 and 31),
  status text not null default 'PENDING' check (status in ('PENDING', 'PAID')),
  status_month text check (status_month ~ '^\d{4}-\d{2}$'),
  created_at timestamptz not null default now()
);

create index fixed_expenses_user_day_idx
  on public.fixed_expenses (user_id, charge_day);

alter table public.fixed_expenses enable row level security;

create policy "Los usuarios ven sus gastos fijos"
  on public.fixed_expenses for select
  using (auth.uid() = user_id);

create policy "Los usuarios crean sus gastos fijos"
  on public.fixed_expenses for insert
  with check (auth.uid() = user_id);

create policy "Los usuarios actualizan sus gastos fijos"
  on public.fixed_expenses for update
  using (auth.uid() = user_id);

create policy "Los usuarios eliminan sus gastos fijos"
  on public.fixed_expenses for delete
  using (auth.uid() = user_id);
