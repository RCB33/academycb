import { requireCoachAccess } from '@/lib/auth'
import Link from 'next/link'
export default async function CoachPlayers(){
 const {supabase}=await requireCoachAccess()
 const {data,error}=await supabase.from('children').select('id,full_name,team:teams(name)').order('full_name')
 const {data:assignments}=await supabase.from('academy_group_assignments').select('child_id,team:teams(name)')
 const names=(id:string,primary:unknown)=>[...new Set([...(assignments||[]).filter(a=>a.child_id===id).flatMap(a=>Array.isArray(a.team)?a.team:[a.team]),primary as {name:string}|null].filter(Boolean).map(t=>t!.name))].join(' · ')
 return <div className="mx-auto max-w-4xl space-y-4 p-5"><h1 className="text-2xl font-bold text-navy">Mis jugadores</h1><p className="text-sm text-slate-500">Solo jugadores de tus equipos asignados. No incluye pagos ni información económica.</p>{error?<p>No se pudieron cargar los jugadores.</p>:data?.length?data.map(p=><Link className="block rounded-xl border bg-white p-4" key={p.id} href={`/coach/jugadores/${p.id}`}><strong>{p.full_name}</strong><p className="text-sm">{names(p.id,p.team)||'Grupo asignado'}</p></Link>):<p>No tienes jugadores asignados. Coordinación debe vincularte como entrenador del equipo.</p>}</div>
}
