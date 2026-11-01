export default function FixedExpensesLoading() {
  return (
    <main
      aria-busy="true"
      aria-label="Cargando los gastos fijos"
      className="mx-auto w-full max-w-[1000px] px-4 pb-12 md:px-8 xl:px-12"
    >
      <div className="-mx-4 flex h-14 items-center border-b border-line px-4 md:hidden">
        <div className="skeleton h-4 w-28 rounded-[4px]" />
      </div>
      <div className="hidden pb-6 pt-8 md:block xl:pt-10">
        <div className="skeleton h-6 w-36 rounded-[4px]" />
        <div className="skeleton mt-2 h-4 w-56 rounded-[4px]" />
      </div>

      <div className="grid grid-cols-2 gap-6 border-b border-line pb-6 pt-5 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i}>
            <div className="skeleton h-3 w-20 rounded-[4px]" />
            <div className="skeleton mt-2 h-6 w-24 rounded-[4px]" />
          </div>
        ))}
      </div>

      <div className="pt-6">
        <div className="skeleton h-4 w-40 rounded-[4px]" />
        <div className="mt-4 border-t border-line">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 border-b border-line py-3.5">
              <div className="skeleton h-9 w-9 rounded-control" />
              <div className="flex-1">
                <div className="skeleton h-3.5 w-32 rounded-[4px]" />
                <div className="skeleton mt-1.5 h-3 w-28 rounded-[4px]" />
              </div>
              <div className="skeleton h-3.5 w-16 rounded-[4px]" />
              <div className="skeleton h-8 w-24 rounded-control" />
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
