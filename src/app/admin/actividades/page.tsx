import { adminReadAll } from '@/lib/admin-read-all'
import Link from 'next/link'
import { requireAdmin } from '@/lib/auth'
import { ActivityNavigation } from '@/components/admin/activity-navigation'
import { ActivityPlayers } from './players'
import { christmasTournaments, registrationStatuses } from '@/lib/christmas-tournaments'

export default async function ActivitiesAdminPage() {
 const {supabase}=await requireAdmin()
 const [events,campus,requests,children,operations]=await Promise.all([
    adminReadAll((from,to)=>supabase.from('event_registrations').select('id,child_id,tournaments,approved_tournaments,status,details').order('id').range(from,to)),
    adminReadAll((from,to)=>supabase.from('campus_enrollments').select('id,child_id,status,campus_id,campus:campuses(name)').order('id').range(from,to)),
    adminReadAll((from,to)=>supabase.from('enrollment_requests').select('id,status').eq('service','campus').order('id').range(from,to)),
    adminReadAll((from,to)=>supabase.from('children').select('id,full_name,birth_year').is('archived_at',null).order('full_name').order('id').range(from,to)),
    adminReadAll((from,to)=>supabase.from('event_registration_operations').select('registration_id,teams').order('registration_id').range(from,to)),
 ])
 if([events,campus,requests,children,operations].some(r=>r.error))throw new Error('No se pudo cargar el resumen de actividades.')
 const rows=(children.data || []).map(child=>({ ...child,
  tournaments:(events.data || []).filter(r=>r.child_id===child.id&&r.status!=='cancelled').flatMap(r=>(r.approved_tournaments||r.tournaments).map((id:string)=>({name:christmasTournaments.find(t=>t.id===id)?.name||id,status:registrationStatuses[r.status],team:(operations.data || []).find(o=>o.registration_id===r.id)?.teams?.[id] || ''}))),
  campuses:(campus.data||[]).filter(e=>e.child_id===child.id&&e.status!=='cancelled').map(e=>({name:(Array.isArray(e.campus)?e.campus[0]:e.campus)?.name||'Campus',status:({reserved:'Reservado',pending_payment:'Pendiente de pago',confirmed:'Inscripción confirmada'} as Record<string,string>)[e.status]||e.status})),
 }))
 return <main className="space-y-6 p-4 md:p-8"><ActivityNavigation/><h1 className="text-3xl font-black">Torneos y campus · control general</h1><p className="text-slate-600">Vista exclusiva del administrador general. Las solicitudes, las plazas y los pagos son estados distintos. No se ha creado ningún acceso de responsable.</p><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{[
  {label:'Torneos por revisar',value:events.data?.filter(r=>r.status==='requested').length,href:'/admin/torneos/inscripciones'},
  {label:'Justificantes por comprobar',value:events.data?.filter(r=>r.status==='proof_review').length,href:'/admin/torneos/inscripciones'},
  {label:'Solicitudes de campus abiertas',value:requests.data?.filter(r=>!['lost','enrolled'].includes(r.status)).length,href:'/admin/campus/solicitudes'},
  {label:'Inscripciones de campus activas',value:campus.data?.filter(r=>r.status!=='cancelled').length,href:'/admin/campus'},
 ].map(k=><Link key={k.label} href={k.href} className="rounded-2xl border bg-white p-5"><span className="block text-3xl font-black text-navy">{k.value||0}</span><span className="mt-2 block text-sm text-slate-600">{k.label}</span></Link>)}</div><ActivityPlayers players={rows}/></main>
}
