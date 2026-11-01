export default function PlanLoading() {
  return (
    <main
      aria-busy="true"
      aria-label="Cargando el plan"
      className="mx-auto w-full max-w-[1000px] px-4 pb-12 md:px-8 xl:px-12"
    >
      <div className="-mx-4 flex h-14 items-center border-b border-line px-4 md:hidden">
        <div className="skeleton h-4 w-20 rounded-[4px]" />
      </div>
      <div className="hidden pb-6 pt-8 md:block xl:pt-10">
        <div className="skeleton h-6 w-24 rounded-[4px]" />
        <div className="skeleton mt-2 h-4 w-56 rounded-[4px]" />
      </div>

      <div className="flex gap-2 pt-3 md:pt-0">
        <div className="skeleton h-9 w-28 rounded-control" />
        <div className="skeleton h-9 w-20 rounded-control" />
      </div>

      <div className="flex items-center justify-between gap-3 border-b border-line pb-3 pt-5">
        <div className="skeleton h-8 w-8 rounded-control" />
        <div className="skeleton h-4 w-32 rounded-[4px]" />
        <div className="skeleton h-8 w-8 rounded-control" />
      </div>

      <div className="pt-6">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-2 border-b border-line py-3.5">
            <div className="flex justify-between">
              <div className="skeleton h-3.5 w-24 rounded-[4px]" />
              <div className="skeleton h-3.5 w-28 rounded-[4px]" />
            </div>
            <div className="skeleton h-1.5 w-full rounded-[3px]" />
            <div className="skeleton h-3 w-40 rounded-[4px]" />
          </div>
        ))}
      </div>
    </main>
  );
}
