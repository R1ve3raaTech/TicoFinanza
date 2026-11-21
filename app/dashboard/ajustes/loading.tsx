import { LoadingBadge } from "@/components/brand/BrandLoader";

/**
 * La carga de Ajustes.
 *
 * El esqueleto imita lo que viene: la tarjeta de cuenta arriba y las dos
 * columnas de `SettingsScreen` —índice a la izquierda, panel a la derecha
 * desde `lg`—. Con las mismas medidas, la pantalla no salta al llegar.
 *
 * Faltaba. Ajustes volvió a ser pantalla y su `loading.tsx` se había
 * borrado cuando pasó a ser un diálogo, así que era la única sección que
 * cargaba sin la marca animada ni esqueleto.
 */
export default function AjustesLoading() {
  return (
    <main
      aria-busy="true"
      aria-label="Cargando los ajustes"
      className="mx-auto w-full max-w-[1180px] px-4 pb-10 sm:px-6"
    >
      <LoadingBadge />

      {/* El PageHeader: barra fija en teléfono, título en escritorio. */}
      <div className="-mx-4 flex h-14 items-center border-b border-line px-4 md:hidden">
        <div className="skeleton h-4 w-20 rounded-[4px]" />
      </div>
      <div className="hidden pb-6 pt-8 md:block xl:pt-10">
        <div className="skeleton h-6 w-24 rounded-[4px]" />
      </div>

      {/* La tarjeta de cuenta. */}
      <div className="mt-4 flex items-center gap-4 rounded-surface border border-line bg-surface p-4 sm:p-5 md:mt-0">
        <div className="skeleton h-14 w-14 shrink-0 rounded-full sm:h-16 sm:w-16" />
        <div className="flex min-w-0 flex-col gap-2">
          <div className="skeleton h-4 w-40 rounded-[4px]" />
          <div className="skeleton h-3 w-52 max-w-full rounded-[4px]" />
          <div className="skeleton h-3 w-36 rounded-[4px]" />
        </div>
      </div>

      <div className="grid gap-8 pt-6 lg:grid-cols-[17rem_1fr]">
        {/* El índice: nueve entradas con su marca, su nombre y su valor. */}
        <div className="flex flex-col rounded-surface border border-line bg-surface p-1.5">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-2.5 py-2.5">
              <div className="skeleton h-9 w-9 shrink-0 rounded-control" />
              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                <div className="skeleton h-3.5 w-28 rounded-[4px]" />
                <div className="skeleton h-3 w-20 rounded-[4px]" />
              </div>
            </div>
          ))}
        </div>

        {/* El panel. Solo desde `lg`: en teléfono la primera pantalla es el
            índice, así que un segundo bloque acá sería un hueco. */}
        <div className="hidden flex-col gap-4 lg:flex">
          <div className="skeleton h-6 w-32 rounded-[4px]" />
          <div className="flex flex-col rounded-surface border border-line bg-surface px-5">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center justify-between gap-4 border-b border-line py-4 last:border-b-0"
              >
                <div className="skeleton h-3.5 w-36 rounded-[4px]" />
                <div className="skeleton h-8 w-32 rounded-control" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
