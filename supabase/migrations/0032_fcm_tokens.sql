-- Los dispositivos Android que pueden recibir avisos por Firebase.
--
-- **Es otra tabla y no una columna más en `push_subscriptions`.** Las dos
-- guardan "a qué aparato mandarle", pero no son lo mismo: una suscripción
-- web son tres datos (endpoint y dos claves de cifrado) que entiende el
-- navegador, y un token de FCM es una cadena sola que entiende Google.
-- Meterlos juntos obligaría a dejar columnas en nulo y a que cada envío se
-- acuerde de mirar cuál de las dos formas le tocó.
--
-- **Segura de correr y segura de NO correrla**: sin ella el APK no puede
-- registrar su token y lo dice en pantalla, y los avisos del navegador
-- siguen funcionando igual por `push_subscriptions`.

create table if not exists public.fcm_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  -- Único a secas, y no por usuario: un teléfono que cambia de cuenta
  -- recibe el mismo token, y sin esto el aviso le llegaría a la cuenta
  -- vieja. Al registrarse, el token se reasigna a quien lo esté usando.
  token text not null unique,
  created_at timestamptz not null default now(),
  -- Para saber cuál dejó de usarse, sin tener que esperar a que Google lo
  -- declare muerto.
  last_seen_at timestamptz not null default now()
);

create index if not exists fcm_tokens_user_idx on public.fcm_tokens (user_id);

alter table public.fcm_tokens enable row level security;

-- Las cuatro políticas, la de UPDATE incluida. Sin ella, reasignar un
-- token a otra cuenta no alcanzaría ninguna fila **y no daría error**:
-- PostgREST contestaría bien y la app creería que registró el dispositivo.
-- Es exactamente lo que pasó con `user_categories` (ver la 0027).
create policy "Los usuarios ven sus tokens"
  on public.fcm_tokens for select using (auth.uid() = user_id);
create policy "Los usuarios crean sus tokens"
  on public.fcm_tokens for insert with check (auth.uid() = user_id);
create policy "Los usuarios actualizan sus tokens"
  on public.fcm_tokens for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Los usuarios eliminan sus tokens"
  on public.fcm_tokens for delete using (auth.uid() = user_id);
