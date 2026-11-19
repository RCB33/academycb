export default function Loading() {
  return (
    <div
      aria-label="Cargando resumen"
      role="status"
      className="space-y-6 motion-safe:animate-pulse"
    >
      <div className="h-40 rounded-3xl bg-navy/10" />
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-40 rounded-3xl bg-slate-100" />
        ))}
      </div>
      <div className="h-80 rounded-3xl bg-slate-100" />
      <span className="sr-only">Cargando gestión de Academy</span>
    </div>
  );
}
