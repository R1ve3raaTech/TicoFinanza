-- Ícono y color propios para las categorías que crea el usuario.
--
-- Hasta ahora el color y el ícono de cada categoría los decidía la app: las
-- que trae tienen el suyo asignado a mano y las propias reciben uno por hash
-- del nombre (lib/categoryStyle.ts). Eso sirve para que una lista larga se
-- lea de un vistazo, pero no deja elegir: "Ferretería" quedaba con la inicial
-- "F" y el tono que le tocara.
--
-- Las dos columnas son NULL por defecto y la app las trata como "elegí vos
-- por mí": mientras nadie las toque, todo se ve exactamente igual que antes.
-- Por eso esta migración es segura de correr en cualquier momento, y también
-- es segura de NO correr: lo único que deja de andar sin ella es el selector
-- nuevo, no el resto de la app.
--
-- `icon` guarda el nombre del Material Symbol ("restaurant"), no el dibujo.
-- `color` guarda la CLAVE del tono ("naranja"), no un hexadecimal: así el
-- mismo color se adapta al tema claro y al oscuro, que son valores distintos
-- del mismo token (--cat-naranja en app/globals.css).

alter table public.user_categories
  add column if not exists icon text,
  add column if not exists color text;

-- Nombres de tono válidos: los diez de la paleta de categorías. Un valor
-- fuera de la lista dejaría la marca sin color, y la app no tendría de dónde
-- darse cuenta.
alter table public.user_categories
  drop constraint if exists user_categories_color_check;

alter table public.user_categories
  add constraint user_categories_color_check
  check (
    color is null
    or color in (
      'naranja', 'indigo', 'celeste', 'cian', 'azul',
      'violeta', 'fucsia', 'pizarra', 'piedra', 'verde'
    )
  );
