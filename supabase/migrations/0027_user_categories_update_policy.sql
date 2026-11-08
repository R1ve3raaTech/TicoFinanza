-- Falta la política de UPDATE de `user_categories`.
--
-- La tabla se creó en la 0005 con políticas de SELECT, INSERT y DELETE, y
-- sin la de UPDATE. Mientras una categoría no se pudo editar, eso no se
-- notó; desde la 0025 (ícono y color propios) sí.
--
-- **El síntoma fue el peor posible: la app decía "guardada" y no guardaba
-- nada.** Con RLS activo y sin política de UPDATE, el UPDATE no es un
-- error: simplemente no alcanza ninguna fila. PostgREST contesta sin error,
-- así que la acción del servidor no tenía de qué darse cuenta y devolvía
-- éxito. Por eso, además de esta política, `updateCategory` ahora pide la
-- fila escrita de vuelta (`.select()`) y trata "cero filas" como fallo: una
-- acción nunca debe afirmar que guardó sin prueba de que guardó.
--
-- `using` dice qué filas se pueden tocar y `with check` qué puede quedar
-- escrito. Las dos hacen falta: sin la segunda, un UPDATE podría cambiarle
-- el `user_id` a la fila y regalarle la categoría a otra cuenta.
--
-- Segura de correr en cualquier momento. Sin ella, lo único que falla es
-- editar una categoría propia (crear y borrar siguen andando).

drop policy if exists "Users can update their own categories" on public.user_categories;

create policy "Users can update their own categories"
  on public.user_categories for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
