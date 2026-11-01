export function AuthLoading() {
  return <main aria-busy="true" aria-label="Cargando la pantalla de entrada" className="flex min-h-[100dvh] items-center justify-center bg-ground px-6">
    <div role="status" className="w-full max-w-sm space-y-5">
      <p className="text-sm text-ink-2">Cargando…</p>
      <div aria-hidden className="skeleton h-8 w-3/4 rounded-control" />
      <div aria-hidden className="skeleton h-11 rounded-control" />
      <div aria-hidden className="skeleton h-11 rounded-control" />
    </div>
  </main>;
}
