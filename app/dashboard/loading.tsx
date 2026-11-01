export default function DashboardLoading() {
  return (
    <main
      aria-busy="true"
      aria-label="Cargando el resumen"
      className="mx-auto w-full max-w-[1180px] px-4 pb-12 md:px-8 xl:px-12"
    >
      <div className="-mx-4 flex h-14 items-center border-b border-line px-4 md:hidden">
        <div className="skeleton h-4 w-28 rounded-[4px]" />
      </div>
      <div className="hidden pb-6 pt-8 md:block xl:pt-10">
        <div className="skeleton h-6 w-32 rounded-[4px]" />
        <div className="skeleton mt-2 h-4 w-48 rounded-[4px]" />
      </div>

      <div className="pt-3 md:pt-0">
        <div className="skeleton h-4 w-36 rounded-[4px]" />
        <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-surface border border-line bg-surface p-4">
              <div className="skeleton h-3 w-20 rounded-[4px]" />
              <div className="skeleton mt-3 h-6 w-24 rounded-[4px]" />
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-10 pt-8 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-12 xl:gap-16">
        <div>
          <div className="skeleton h-4 w-32 rounded-[4px]" />
          <div className="mt-4 border-t border-line">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 border-b border-line py-3.5">
                <div className="flex-1">
                  <div className="skeleton h-3.5 w-36 rounded-[4px]" />
                  <div className="skeleton mt-1.5 h-3 w-24 rounded-[4px]" />
                </div>
                <div className="skeleton h-3.5 w-16 rounded-[4px]" />
              </div>
            ))}
          </div>
        </div>
        <div>
          <div className="skeleton h-4 w-28 rounded-[4px]" />
          <div className="skeleton mt-4 h-56 w-full rounded-[4px]" />
        </div>
      </div>
    </main>
  );
}
