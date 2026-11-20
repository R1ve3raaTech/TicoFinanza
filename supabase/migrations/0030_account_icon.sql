-- Ícono propio para cada cuenta, igual que las categorías (ver la 0025).
--
-- Hasta ahora el ícono de una billetera lo decidía su tipo: todas las de
-- débito con el mismo banco dibujado, todas las de ahorro con la misma
-- alcancía. Con dos cuentas del mismo tipo —la del banco y la de la
-- planilla, por ejemplo— no había nada que las separara de un vistazo, que
-- es justo para lo que se mira esa lista.
--
-- Guarda el NOMBRE del Material Symbol ("savings"), no el dibujo; los
-- trazos viven en lib/materialSymbols.ts. `null` quiere decir "el que le
-- toca por su tipo", que es lo que venía pasando.
--
-- Segura de correr en cualquier momento y segura de NO correrla: sin la
-- columna cada cuenta sigue mostrando el ícono de su tipo y lo único que
-- falla es elegir otro, que lo dice en pantalla.

alter table public.accounts
  add column if not exists icon text;
