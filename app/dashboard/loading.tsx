export default function DashboardLoading() {
  return (
    <main
      aria-busy="true"
      aria-label="Cargando el dashboard"
      className="mx-auto w-full max-w-[1180px] px-4 pb-12 md:px-8 xl:px-12"
    >
      <div className="-mx-4 flex h-14 items-center border-b border-line px-4 md:hidden">
        <div className="skeleton h-4 w-28 rounded-[4px]" />
      </div>
      <div className="hidden pb-6 pt-8 md:block xl:pt-10">
        <div className="skeleton h-6 w-32 rounded-[4px]" />
        <div className="skeleton mt-2 h-4 w-48 rounded-[4px]" />
      </div>

      <div className="flex gap-2 pt-3 md:pt-0">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="skeleton h-8 w-14 rounded-control" />
        ))}
      </div>

      <div className="border-b border-line py-6">
        <div className="skeleton h-4 w-32 rounded-[4px]" />
        <div className="skeleton mt-3 h-12 w-60 rounded-[4px]" />
      </div>

      <div className="grid gap-10 pt-6 lg:grid-cols-[minmax(0,1fr)_280px] lg:gap-12 xl:grid-cols-[minmax(0,1fr)_320px] xl:gap-16">
        <div>
          <div className="skeleton mb-4 h-10 w-full rounded-control" />
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 border-b border-line py-3">
              <div className="skeleton h-8 w-8 rounded-[6px]" />
              <div className="flex-1">
                <div className="skeleton h-3.5 w-40 rounded-[4px]" />
                <div className="skeleton mt-1.5 h-3 w-24 rounded-[4px]" />
              </div>
              <div className="skeleton h-3.5 w-20 rounded-[4px]" />
            </div>
          ))}
        </div>
        <div className="hidden lg:block">
          <div className="skeleton h-4 w-32 rounded-[4px]" />
          <div className="skeleton mt-5 h-40 w-full rounded-[4px]" />
        </div>
      </div>
    </main>
  );
}
