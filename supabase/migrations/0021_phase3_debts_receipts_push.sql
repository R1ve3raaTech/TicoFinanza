-- Fase 3: comprobantes adjuntos a los movimientos, control de deudas y
-- préstamos entre personas, y recordatorios push de gastos fijos.
--
-- No cambia la forma de nada de lo que ya existe: a `transactions` se le
-- agrega una columna que puede quedar en null, y a `user_settings` un flag
-- con default. Correr después de 0020_multicount_budgets_goals.sql.

-- ---------------------------------------------------------------------------
-- 1. Comprobantes (fotos de recibos y capturas de SINPE Móvil)
-- ---------------------------------------------------------------------------
-- Guarda la RUTA del archivo dentro del bucket `receipts`
-- ("<user_id>/<uuid>.jpg"), no una URL navegable: el bucket es privado y
-- cada vista se sirve con una URL firmada de corta vida (ver
-- getReceiptUrl() en app/dashboard/actions.ts). Un comprobante de pago trae
-- nombre, monto y a veces número de cuenta: con un bucket público bastaría
-- con que se filtre un link para que quede expuesto para siempre.
alter table public.transactions
  add column receipt_url text;

comment on column public.transactions.receipt_url is
  'Ruta del comprobante dentro del bucket privado `receipts`, no una URL pública.';

-- El bucket. 5 MB por archivo alcanza de sobra para la foto de un recibo y
-- le pone un techo a lo que puede subir una cuenta comprometida.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'receipts',
  'receipts',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf']
)
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- La primera carpeta de la ruta es el id del usuario, y es lo único que la
-- política mira: así nadie puede leer, subir ni borrar dentro de la carpeta
-- de otra persona aunque adivine el nombre del archivo.
drop policy if exists "Los usuarios ven sus comprobantes" on storage.objects;
drop policy if exists "Los usuarios suben sus comprobantes" on storage.objects;
drop policy if exists "Los usuarios reemplazan sus comprobantes" on storage.objects;
drop policy if exists "Los usuarios borran sus comprobantes" on storage.objects;

create policy "Los usuarios ven sus comprobantes"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'receipts'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Los usuarios suben sus comprobantes"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'receipts'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Los usuarios reemplazan sus comprobantes"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'receipts'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Los usuarios borran sus comprobantes"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'receipts'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ---------------------------------------------------------------------------
-- 2. Deudas y préstamos a terceros
-- ---------------------------------------------------------------------------
-- Tabla aparte y no un movimiento más: prestarle ₡20.000 a alguien no es un
-- gasto (la plata sigue siendo tuya, solo que no la tenés), y que te deban no
-- es un ingreso hasta que te pagan. Mezclarlo con `transactions` le mentiría
-- al superávit del mes. Cuando la deuda se salda ahí sí se puede registrar el
-- movimiento real, y es una decisión de quien la salda (settleDebt en
-- app/dashboard/plan/actions.ts).
create table public.debts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  type text not null check (type in ('me_deben', 'debo')),
  person_name text not null,
  amount numeric(14, 2) not null check (amount > 0),
  currency text not null default 'CRC' check (currency = 'CRC'),
  due_date date,
  status text not null default 'pendiente' check (status in ('pendiente', 'pagado')),
  notes text,
  -- Movimiento con el que se saldó, si se registró uno. `set null` para que
  -- borrar ese movimiento no se lleve el historial de la deuda.
  settled_transaction_id uuid references public.transactions (id) on delete set null,
  settled_at timestamptz,
  created_at timestamptz not null default now()
);

create index debts_user_status_idx on public.debts (user_id, status, due_date);

alter table public.debts enable row level security;

create policy "Los usuarios ven sus deudas"
  on public.debts for select using (auth.uid() = user_id);
create policy "Los usuarios crean sus deudas"
  on public.debts for insert with check (auth.uid() = user_id);
create policy "Los usuarios actualizan sus deudas"
  on public.debts for update using (auth.uid() = user_id);
create policy "Los usuarios eliminan sus deudas"
  on public.debts for delete using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- 3. Recordatorios push de gastos fijos
-- ---------------------------------------------------------------------------
-- Una fila por dispositivo (no por usuario): el mismo usuario puede tener el
-- teléfono y la compu suscritos, y cada navegador da su propio endpoint.
create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

create index push_subscriptions_user_idx on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;

create policy "Los usuarios ven sus suscripciones"
  on public.push_subscriptions for select using (auth.uid() = user_id);
create policy "Los usuarios crean sus suscripciones"
  on public.push_subscriptions for insert with check (auth.uid() = user_id);
create policy "Los usuarios actualizan sus suscripciones"
  on public.push_subscriptions for update using (auth.uid() = user_id);
create policy "Los usuarios eliminan sus suscripciones"
  on public.push_subscriptions for delete using (auth.uid() = user_id);

-- El interruptor de Ajustes. Es por usuario (querer o no los recordatorios),
-- mientras la suscripción es por dispositivo: son dos cosas distintas y por
-- eso viven en tablas distintas.
alter table public.user_settings
  add column reminders_enabled boolean not null default false;

-- Qué recordatorio ya se mandó. Sin esto, un reintento del cron (o dos
-- corridas el mismo día) vuelve a avisar lo mismo, y una notificación
-- repetida es la forma más rápida de que alguien apague los avisos.
create table public.push_reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  fixed_expense_id uuid not null references public.fixed_expenses (id) on delete cascade,
  -- Día del cobro que se avisó, "YYYY-MM-DD". El mismo gasto se vuelve a
  -- avisar el mes que viene porque el día de cobro es otro.
  due_key text not null check (due_key ~ '^\d{4}-\d{2}-\d{2}$'),
  -- Cuántos días antes era el aviso (2 o 1). Forma parte de la clave porque
  -- un cobro lleva dos avisos para el MISMO vencimiento: sin esto, el de
  -- "mañana se cobra" se tomaría por repetido y nunca saldría.
  days_before smallint not null check (days_before between 1 and 2),
  created_at timestamptz not null default now(),
  unique (fixed_expense_id, due_key, days_before)
);

create index push_reminders_user_idx on public.push_reminders (user_id, created_at desc);

alter table public.push_reminders enable row level security;

-- Las escribe el cron con service_role (que ignora RLS). El usuario solo
-- necesita poder leer las suyas.
create policy "Los usuarios ven sus recordatorios"
  on public.push_reminders for select using (auth.uid() = user_id);
