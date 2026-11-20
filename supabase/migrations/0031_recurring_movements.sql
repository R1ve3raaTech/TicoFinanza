-- Movimientos que se repiten y NO son gastos fijos.
--
-- El almuerzo de todos los días hábiles, el bus, el cafecito. Se parecen a
-- un gasto fijo en que vuelven, y no se parecen en nada más: no tienen día
-- de cobro, el monto cambia, y no son un compromiso del mes — por eso no
-- van en `fixed_expenses` ni restan del saldo proyectado.
--
-- **No hay frecuencia mensual a propósito.** Eso es exactamente un gasto
-- fijo, y tener las dos cosas haciendo lo mismo es cómo se termina con el
-- alquiler anotado dos veces.
--
-- **La app propone, no inserta.** Igual que los ingresos fijos y que los
-- fijos que parecen pagados: el monto del almuerzo no es siempre el mismo,
-- así que insertar a ciegas dejaría el saldo mintiendo todos los días.
-- `last_confirmed_date` es lo que evita proponer dos veces el mismo día.

create table if not exists public.recurring_movements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  description text not null,
  amount numeric(12, 2) not null check (amount > 0),
  category text,
  account_id uuid references public.accounts (id) on delete set null,
  type text not null check (type in ('EXPENSE', 'INCOME')),
  -- 'diario' todos los días; 'habiles' de lunes a viernes; 'semanal' un
  -- día concreto de la semana (0 = domingo, como getUTCDay).
  frequency text not null check (frequency in ('diario', 'habiles', 'semanal')),
  weekday smallint check (weekday between 0 and 6),
  -- Último día que se confirmó, "YYYY-MM-DD" en hora de Costa Rica.
  last_confirmed_date date,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  -- Una recurrencia semanal sin día no se puede resolver.
  --
  -- **El nombre no puede ser `recurring_movements_weekday_check`**: ese es
  -- el que Postgres le pone solo al `check` en línea de la columna
  -- `weekday` de arriba (`<tabla>_<columna>_check`), así que las dos
  -- restricciones chocaban dentro del mismo CREATE TABLE y la migración
  -- entera fallaba con 42710.
  constraint recurring_movements_semanal_dia_check
    check (frequency <> 'semanal' or weekday is not null)
);

create index if not exists recurring_movements_user_idx
  on public.recurring_movements (user_id, active);

alter table public.recurring_movements enable row level security;

-- Las cuatro. La de UPDATE no es opcional: sin ella, confirmar un
-- movimiento no podría escribir `last_confirmed_date` y la app lo
-- propondría para siempre — y encima sin dar error (ver la 0027).
drop policy if exists "Users can view their own recurring movements" on public.recurring_movements;
create policy "Users can view their own recurring movements"
  on public.recurring_movements for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own recurring movements" on public.recurring_movements;
create policy "Users can insert their own recurring movements"
  on public.recurring_movements for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own recurring movements" on public.recurring_movements;
create policy "Users can update their own recurring movements"
  on public.recurring_movements for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own recurring movements" on public.recurring_movements;
create policy "Users can delete their own recurring movements"
  on public.recurring_movements for delete
  using (auth.uid() = user_id);
