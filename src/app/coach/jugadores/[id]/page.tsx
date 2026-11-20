import Link from 'next/link'
import {PlayerEvaluationEditor} from '@/components/coach/player-evaluation-editor'
import {PlayerNotes} from '@/components/coach/player-notes'
import {PlayerTrophies} from '@/components/coach/player-trophies'
import type {PlayerEvaluation} from '@/lib/player-evaluation'
import {requireCoachAccess} from '@/lib/auth'
import {notFound} from 'next/navigation'
import {z} from 'zod'
export default async function CoachPlayer({params}:{params:Promise<{id:string}>}){
 const {id}=await params;if(!z.string().uuid().safeParse(id).success)notFound()
 const {supabase}=await requireCoachAccess()
 const {data:child}=await supabase.from('children').select('id,full_name,avatar_url,birth_year,position,preferred_foot').eq('id',id).is('archived_at',null).maybeSingle()
 if(!child)notFound()
 const [{data:notes,error:notesError},{data:metrics,error:metricsError},{data:achievements,error:achievementsError},{data:earned,error:earnedError}]=await Promise.all([
  supabase.from('coach_observations').select('id,body,created_at').eq('child_id',id).order('created_at',{ascending:false}).limit(30),
  supabase.from('child_metrics').select('recorded_at,pace,shooting,passing,dribbling,defending,physical,discipline,notes,visible_to_guardian').eq('child_id',id).order('recorded_at',{ascending:false}).limit(100),
  supabase.from('achievements').select('id,name,description,icon').order('name'),
  supabase.from('child_achievements').select('achievement_id,earned_at,note').eq('child_id',id),
 ])
 if(notesError||metricsError||achievementsError||earnedError)throw new Error('No se pudo cargar el seguimiento del jugador.')
 return <div className="mx-auto max-w-6xl space-y-5 p-4 sm:p-6"><Link className="inline-flex min-h-11 items-center text-sm font-bold text-navy" href="/coach/jugadores">← Todos los jugadores</Link><header className="rounded-3xl bg-navy p-6 text-white"><p className="text-xs font-bold uppercase tracking-widest text-gold">Ficha deportiva</p><h1 className="mt-2 break-words text-2xl font-black">{child.full_name}</h1><p className="mt-3 text-sm text-slate-300">{child.birth_year} · {child.position||'Posición sin definir'} · {child.preferred_foot||'Pierna sin definir'}</p></header><PlayerEvaluationEditor key={id} child={child} evaluations={(metrics||[]) as PlayerEvaluation[]}/><PlayerTrophies childId={id} achievements={achievements||[]} earned={earned||[]}/><PlayerNotes childId={id} notes={notes||[]}/></div>
}
