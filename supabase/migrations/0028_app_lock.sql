-- Cerrojo de la app de Android: huella, y un PIN propio como respaldo.
--
-- Dentro del APK no hay cierre de sesión por inactividad: la sesión se
-- queda viva y lo que protege los datos es este cerrojo, que se pide al
-- abrir la app. En la web NO aplica — ahí sigue el cierre a los 15 minutos,
-- que es lo correcto para una compu prestada.
--
-- **Qué es y qué no es**: un cerrojo de pantalla. Frena a quien agarra el
-- teléfono desbloqueado, que es el caso real. No es cifrado: quien pueda
-- extraer el almacenamiento del teléfono no pasa por acá.
--
-- Las dos columnas son de la CUENTA y no del dispositivo, igual que
-- `reminders_enabled`: el PIN que ponés es el tuyo en cualquier teléfono
-- donde instales la app. Que ESTE teléfono tenga huella es otra cosa, y esa
-- la contesta Android en el momento.
--
-- Segura de correr en cualquier momento y segura de NO correrla: sin ella
-- el cerrojo simplemente no se puede configurar (las columnas se leen de
-- forma tolerante) y el resto de la app sigue igual.

alter table public.user_settings
  -- Hash del PIN, nunca el PIN. Formato: scrypt$<salt hex>$<hash hex>.
  -- null = no hay PIN puesto, así que el único respaldo es la huella.
  add column if not exists app_lock_pin_hash text,
  -- Cada cuánto se vuelve a pedir al volver a la app.
  add column if not exists app_lock_when text not null default '1min';

alter table public.user_settings
  drop constraint if exists user_settings_app_lock_when_check;

-- 'nunca'  → el cerrojo está apagado.
-- 'siempre'→ cada vez que la app vuelve al frente.
-- '1min'   → si estuvo más de un minuto en segundo plano.
-- '5min'   → si estuvo más de cinco minutos.
-- 'inicio' → solo al abrirla de cero; volver al frente no pide nada.
alter table public.user_settings
  add constraint user_settings_app_lock_when_check
  check (app_lock_when in ('nunca', 'siempre', '1min', '5min', 'inicio'));
