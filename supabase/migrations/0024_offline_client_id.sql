-- Clave de deduplicación para los movimientos anotados sin señal.
--
-- Correr después de 0023_recurring_income_and_annual_goals.sql.
--
-- El problema que resuelve: la app guarda en el teléfono lo que se anota
-- sin datos y lo manda cuando vuelve la señal. Si el pedido llega al
-- servidor, la fila se inserta y la respuesta se pierde en el camino (algo
-- normal en una red móvil mala), el navegador ve un fallo de red y vuelve
-- a mandar el mismo movimiento. Sin una clave que los una, el gasto queda
-- anotado dos veces y el saldo deja de cuadrar con el banco, que es
-- justamente lo que esta app promete.
--
-- El id lo genera el navegador al anotar, así que el reintento trae el
-- mismo: con el índice único de abajo, el segundo intento choca y la
-- aplicación lo trata como éxito (la fila ya estaba).
alter table public.transactions
  add column client_id text;

comment on column public.transactions.client_id is
  'Id que generó el navegador al anotar el movimiento. Solo lo traen los que pasaron por la cola sin conexión; sirve para que un reintento no inserte dos veces.';

-- Parcial, con `where client_id is not null`: los movimientos de siempre
-- no tienen clave y no deben chocar entre ellos. En Postgres varios NULL
-- no colisionan en un índice único, pero el índice parcial además los deja
-- fuera por completo, que es más barato y más claro.
--
-- Va por (user_id, client_id) y no solo por client_id: la clave la genera
-- un navegador ajeno, así que no es algo en lo que se pueda confiar como
-- único a nivel global.
create unique index transactions_client_id_unique
  on public.transactions (user_id, client_id)
  where client_id is not null;
