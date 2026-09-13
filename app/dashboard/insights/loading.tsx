export default function InsightsLoading() {
  return (
    <main
      aria-busy="true"
      aria-label="Cargando estadísticas"
      className="mx-auto w-full max-w-[1120px] px-4 pb-12 md:px-8 xl:px-12"
    >
      <div className="-mx-4 flex h-14 items-center border-b border-line px-4 md:hidden">
        <div className="skeleton h-4 w-28 rounded-[4px]" />
      </div>
      <div className="hidden pb-6 pt-8 md:block xl:pt-10">
        <div className="skeleton h-6 w-36 rounded-[4px]" />
        <div className="skeleton mt-2 h-4 w-56 rounded-[4px]" />
      </div>

      <div className="grid grid-cols-2 gap-6 pb-8 pt-5 md:grid-cols-3 md:pt-0">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className={i === 0 ? "col-span-2 md:col-span-1" : undefined}>
            <div className="skeleton h-3.5 w-20 rounded-[4px]" />
            <div className="skeleton mt-2.5 h-7 w-36 rounded-[4px]" />
          </div>
        ))}
      </div>

      <div className="border-t border-line pb-10 pt-5">
        <div className="skeleton h-4 w-32 rounded-[4px]" />
        <div className="skeleton mt-6 h-60 w-full rounded-[4px]" />
      </div>

      <div className="grid md:grid-cols-2 md:gap-x-12">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="border-t border-line pb-10 pt-5">
            <div className="skeleton h-4 w-40 rounded-[4px]" />
            {Array.from({ length: 4 }).map((_, row) => (
              <div key={row} className="border-b border-line py-3">
                <div className="skeleton h-3.5 w-full rounded-[4px]" />
              </div>
            ))}
          </div>
        ))}
      </div>
    </main>
  );
}
