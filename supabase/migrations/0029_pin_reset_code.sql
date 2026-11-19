-- Recuperar el PIN del cerrojo por correo.
--
-- Quitar el PIN exige saberlo, en el APK y en la web (ver 0028 y la nota de
-- esa sesión). Eso deja un camino sin salida: **si lo olvidás, la app queda
-- trabada en ese teléfono para siempre**. El camino de vuelta es el mismo
-- que ya existía para eliminar la cuenta: un código al correo verificado de
-- la cuenta — no a uno que se pueda escribir a mano.
--
-- Se reusa `account_deletion_codes` en vez de crear otra tabla: es la misma
-- cosa (un código de un solo uso, con vencimiento y tope de intentos) y
-- duplicarla sería duplicar también su mantenimiento.
--
-- `purpose` evita que los dos códigos se crucen. Sin esta columna, el
-- código que pediste para quitar el PIN serviría para **borrar tu cuenta**,
-- que es exactamente el tipo de confusión que no puede existir entre una
-- acción reversible y una que no lo es.
--
-- Segura de correr en cualquier momento; sin ella lo único que no anda es
-- recuperar el PIN olvidado.

alter table public.account_deletion_codes
  add column if not exists purpose text not null default 'eliminar_cuenta';

alter table public.account_deletion_codes
  drop constraint if exists account_deletion_codes_purpose_check;

alter table public.account_deletion_codes
  add constraint account_deletion_codes_purpose_check
  check (purpose in ('eliminar_cuenta', 'quitar_pin'));

-- Se busca siempre por (usuario, propósito) y sin consumir.
create index if not exists account_deletion_codes_user_purpose_idx
  on public.account_deletion_codes (user_id, purpose);
