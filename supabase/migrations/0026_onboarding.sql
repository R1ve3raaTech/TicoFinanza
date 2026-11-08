-- La guía de bienvenida: marcar si ya se vio.
--
-- Es una propiedad de la CUENTA y no del navegador: si viviera en el
-- localStorage del teléfono, instalar la app en la compu volvería a mostrar
-- un diálogo que no se puede cerrar por diez segundos a alguien que ya la
-- leyó.
--
-- A quien ya está usando la app se le marca como vista: la guía es para
-- quien se acaba de registrar, no para interrumpir a quien lleva meses
-- anotando. Solo las cuentas nuevas arrancan en `false`.
--
-- Para volver a verla (probarla, por ejemplo):
--   update public.user_settings set onboarding_seen = false
--   where user_id = auth.uid();

alter table public.user_settings
  add column if not exists onboarding_seen boolean not null default false;

-- Las cuentas que ya existen no son nuevas.
update public.user_settings set onboarding_seen = true where onboarding_seen = false;

-- Y las que se creen de ahora en adelante sí arrancan sin verla: el default
-- de la columna se queda en false, que es lo que ya declara el `add column`.
