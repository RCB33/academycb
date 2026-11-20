import Link from 'next/link'
import {notFound} from 'next/navigation'
import {z} from 'zod'
import {requireCoachAccess} from '@/lib/auth'
import {getCoachPlayers} from '@/lib/coach-data'
import {madridDate,validDate,sessionTime,sportArea,SPORT_AREAS,type CoachSession} from '@/lib/coach-workspace'
import {SessionRosterEditor} from '@/components/coach/session-roster-editor'
export default async function SessionDetails({params,searchParams}:{params:Promise<{id:string}>;searchParams:Promise<{date?:string}>}){
 const {id}=await params;if(!z.string().uuid().safeParse(id).success)notFound()
 const {supabase}=await requireCoachAccess()
 const {data,error}=await supabase.from('calendar_events').select('id,title,start_date,end_date,location,source_type,event_type,team_id,is_all_day,teams(name),categories(name)').eq('id',id).neq('status','cancelled').maybeSingle()
 if(error||!data)notFound()
 const event=data as unknown as CoachSession,area=SPORT_AREAS[sportArea(event)]
 const first=madridDate(new Date(event.start_date)),last=madridDate(new Date(Date.parse(event.end_date)-1))
 const requested=validDate((await searchParams).date,first),date=requested>=first&&requested<=last?requested:first
 const [{data:roster,error:rosterError},{data:attendance,error:attendanceError},available]=await Promise.all([supabase.rpc('get_session_players',{event_uuid:id}),supabase.from('training_sessions').select('child_id,attendance').eq('event_id',id).eq('session_date',date),getCoachPlayers()])
 if(rosterError||attendanceError)throw new Error('No se pudo cargar la convocatoria de esta sesión.')
 const players=(roster as Array<{id:string;full_name:string}>||[]).map(p=>({...p,attendance:(attendance?.find(a=>a.child_id===p.id)?.attendance||null) as 'present'|'absent'|'excused'|null}))
 return <div className="mx-auto max-w-3xl space-y-5 p-4 sm:p-6">
  <Link href={`/coach?date=${date}`} className="inline-flex min-h-11 items-center text-sm font-bold text-navy">← Volver a la jornada</Link>
  <header className="rounded-3xl border bg-white p-5 sm:p-6"><span className={`inline-block rounded-full border px-3 py-1 text-xs font-bold ${area.className}`}>{area.label}</span><h1 className="mt-3 break-words text-2xl font-black text-navy">{event.teams?.name||event.categories?.name||event.title}</h1>{(event.teams||event.categories)&&<p className="mt-2 text-sm text-slate-600">{event.title}</p>}<p className="mt-4 text-sm font-semibold">{new Intl.DateTimeFormat('es-ES',{weekday:'long',day:'numeric',month:'long',timeZone:'Europe/Madrid'}).format(new Date(date+'T12:00:00Z'))} · {sessionTime(event)}</p>{event.location&&<p className="mt-2 text-sm text-slate-500">{event.location}</p>}
  {first!==last&&<form className="mt-4 flex flex-wrap items-end gap-2"><label className="text-sm font-semibold">Día de asistencia<input name="date" type="date" min={first} max={last} defaultValue={date} required className="mt-1 block min-h-11 max-w-full rounded-lg border p-2 text-base"/></label><button className="min-h-11 rounded-lg bg-navy px-4 text-sm font-bold text-white">Ver día</button><p className="w-full text-xs text-slate-500">Actividad del {first} al {last}. La asistencia se guarda por día; la convocatoria es común a esta actividad.</p></form>}
  </header><SessionRosterEditor key={date} eventId={id} date={date} players={players} available={available.map(p=>({id:p.id,full_name:p.full_name}))}/>
 </div>
}
