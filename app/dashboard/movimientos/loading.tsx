export default function MovementsLoading() {
  return (
    <main
      aria-busy="true"
      aria-label="Cargando los movimientos"
      className="mx-auto w-full max-w-[1180px] px-4 pb-12 md:px-8 xl:px-12"
    >
      <div className="-mx-4 flex h-14 items-center border-b border-line px-4 md:hidden">
        <div className="skeleton h-4 w-32 rounded-[4px]" />
      </div>
      <div className="hidden pb-6 pt-8 md:block xl:pt-10">
        <div className="skeleton h-6 w-36 rounded-[4px]" />
        <div className="skeleton mt-2 h-4 w-60 rounded-[4px]" />
      </div>

      <div className="flex gap-2 pt-3 md:pt-0">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="skeleton h-8 w-14 rounded-control" />
        ))}
      </div>

      {/* Mismas medidas que SectionLead: rótulo, cifra grande y las dos
          cifras de apoyo. */}
      <div className="pb-6 pt-4 md:pt-2">
        <div className="skeleton h-3 w-40 rounded-[4px]" />
        <div className="skeleton mt-2 h-12 w-56 rounded-[6px] md:h-14 md:w-64" />
        <div className="skeleton mt-4 h-3 w-60 rounded-[4px]" />
        <div className="skeleton mt-4 h-3.5 w-72 max-w-full rounded-[4px]" />
      </div>

      <div className="border-t border-line pt-6">
        <div className="skeleton h-10 w-full rounded-control" />
        <div className="mt-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 border-b border-line py-3">
              <div className="skeleton h-8 w-8 rounded-control" />
              <div className="flex-1">
                <div className="skeleton h-3.5 w-40 rounded-[4px]" />
                <div className="skeleton mt-1.5 h-3 w-24 rounded-[4px]" />
              </div>
              <div className="skeleton h-3.5 w-20 rounded-[4px]" />
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
