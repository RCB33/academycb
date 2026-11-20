import 'server-only'
import {requireCoachAccess} from '@/lib/auth'
import {madridMidnight,type CoachSession} from '@/lib/coach-workspace'
export async function getCoachSessions(from:string,to:string,counts=false){
 const {supabase}=await requireCoachAccess(),events:CoachSession[]=[]
 for(let offset=0;;offset+=500){
  const {data,error}=await supabase.from('calendar_events').select('id,title,start_date,end_date,location,source_type,event_type,team_id,is_all_day,teams(name),categories(name)').lt('start_date',madridMidnight(to)).gt('end_date',madridMidnight(from)).neq('status','cancelled').order('start_date').order('id').range(offset,offset+499)
  if(error)throw new Error('No se pudo cargar el calendario. Inténtalo de nuevo.')
  events.push(...(data as unknown as CoachSession[]));if(data.length<500)break
 }
 if(counts)await Promise.all(events.map(async e=>{const {data,error}=await supabase.rpc('get_session_players',{event_uuid:e.id});if(!error)e.playerCount=data?.length||0}))
 return events
}
export async function getCoachPlayers(){
 const {supabase}=await requireCoachAccess()
 const players:Array<{id:string;full_name:string;birth_year:number;team:{name:string}|null}>=[]
 for(let offset=0;;offset+=500){
  const {data,error}=await supabase.from('children').select('id,full_name,birth_year,team:teams(name)').is('archived_at',null).order('full_name').order('id').range(offset,offset+499)
  if(error)throw new Error('No se pudieron cargar los jugadores.')
  players.push(...data as unknown as typeof players);if(data.length<500)break
 }
 const groups=new Map<string,Set<string>>()
 for(const p of players)groups.set(p.id,new Set(p.team?.name?[p.team.name]:[]))
 for(let offset=0;;offset+=500){
  const {data,error}=await supabase.from('academy_group_assignments').select('child_id,team:teams(name)').order('membership_id').order('team_id').range(offset,offset+499)
  if(error)throw new Error('No se pudieron cargar los grupos de los jugadores.')
  for(const a of data){const team=a.team as unknown as {name:string}|null;if(team?.name)groups.get(a.child_id)?.add(team.name)}
  if(data.length<500)break
 }
 return players.map(p=>({...p,groups:[...(groups.get(p.id)||[])].join(' · ')}))
}
