export default function SettingsLoading() {
  return (
    <main
      aria-busy="true"
      aria-label="Cargando ajustes"
      className="mx-auto w-full max-w-[1000px] px-4 pb-16 md:px-8 xl:px-12"
    >
      <div className="-mx-4 flex h-14 items-center border-b border-line px-4 md:hidden">
        <div className="skeleton h-4 w-20 rounded-[4px]" />
      </div>
      <div className="hidden pb-6 pt-8 md:block xl:pt-10">
        <div className="skeleton h-6 w-24 rounded-[4px]" />
        <div className="skeleton mt-2 h-4 w-64 rounded-[4px]" />
      </div>

      <div className="lg:grid lg:grid-cols-[170px_minmax(0,1fr)] lg:gap-14">
        <div className="hidden flex-col gap-3 lg:flex">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="skeleton h-3.5 w-24 rounded-[4px]" />
          ))}
        </div>
        <div className="max-w-[720px] pt-6 lg:pt-0">
          {Array.from({ length: 3 }).map((_, section) => (
            <div key={section} className="pb-12">
              <div className="skeleton h-4 w-28 rounded-[4px]" />
              <div className="skeleton mt-2 h-3.5 w-72 max-w-full rounded-[4px]" />
              <div className="mt-4 border-t border-line">
                {Array.from({ length: 3 }).map((_, row) => (
                  <div key={row} className="flex items-center gap-6 border-b border-line py-4">
                    <div className="skeleton h-3.5 w-24 rounded-[4px]" />
                    <div className="skeleton h-9 flex-1 rounded-control" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
