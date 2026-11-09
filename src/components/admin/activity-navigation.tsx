import Link from 'next/link'

export function ActivityNavigation() {
  return <nav aria-label="Gestión de actividades" className="flex flex-wrap gap-2 rounded-2xl border bg-white p-3 text-sm font-semibold">
    {[['/admin/actividades','Resumen y jugadores'],['/admin/torneos/inscripciones','Solicitudes de torneos'],['/admin/torneos','Torneos y equipos'],['/admin/campus/solicitudes','Solicitudes de campus'],['/admin/campus','Ediciones y alumnos']].map(([href,label]) => <Link key={href} href={href} className="rounded-lg bg-slate-100 px-3 py-2 text-navy hover:bg-gold/20">{label}</Link>)}
  </nav>
}
