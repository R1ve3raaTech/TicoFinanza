/**
 * El reporte era la única pantalla del área con sesión sin esqueleto: al
 * entrar quedaba en blanco hasta que llegaban los datos.
 *
 * Las medidas copian las del reporte de verdad (mismo ancho, mismo orden:
 * volver, navegación de mes, encabezado, resumen y tablas) para que al
 * llegar el contenido nada salte de lugar.
 */
export default function ReportLoading() {
  return (
    <main
      aria-busy="true"
      aria-label="Cargando el reporte"
      className="mx-auto w-full max-w-[860px] px-4 pb-12 pt-6 md:px-8 md:pt-4"
    >
      <div className="skeleton h-5 w-20 rounded-[4px]" />

      <div className="flex items-center justify-between gap-3 pb-6 pt-2">
        <div className="flex gap-1">
          <div className="skeleton h-9 w-9 rounded-control" />
          <div className="skeleton h-9 w-9 rounded-control" />
        </div>
        <div className="skeleton h-9 w-48 rounded-control" />
      </div>

      <div className="border-b border-line pb-4">
        <div className="skeleton h-3 w-44 rounded-[4px]" />
        <div className="skeleton mt-2 h-7 w-56 rounded-[4px]" />
        <div className="skeleton mt-2 h-3 w-72 rounded-[4px]" />
      </div>

      <div className="mt-6">
        <div className="skeleton h-4 w-20 rounded-[4px]" />
        <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-3 border-y border-line py-3 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i}>
              <div className="skeleton h-3 w-20 rounded-[4px]" />
              <div className="skeleton mt-1.5 h-4 w-24 rounded-[4px]" />
            </div>
          ))}
        </div>
      </div>

      {Array.from({ length: 2 }).map((_, block) => (
        <div key={block} className="mt-6">
          <div className="skeleton h-4 w-40 rounded-[4px]" />
          <div className="mt-3 border-y border-line py-1.5">
            <div className="skeleton h-3 w-full rounded-[4px]" />
          </div>
          {Array.from({ length: 4 }).map((_, row) => (
            <div
              key={row}
              className="flex items-center justify-between gap-4 border-b border-line py-2.5"
            >
              <div className="skeleton h-3.5 w-32 rounded-[4px]" />
              <div className="skeleton h-3.5 w-20 rounded-[4px]" />
            </div>
          ))}
        </div>
      ))}
    </main>
  );
}
