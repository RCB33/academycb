import { PlayerEvaluationEditor } from '@/components/coach/player-evaluation-editor'
import type { PlayerEvaluation } from '@/lib/player-evaluation'
import { requireCoachAccess } from '@/lib/auth'
import { notFound } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
export default async function CoachPlayer({params}:{params:Promise<{id:string}>}){
 const {id}=await params
 if(!z.string().uuid().safeParse(id).success)notFound()
 const {supabase}=await requireCoachAccess()
 const {data:child}=await supabase.from('children').select('id,full_name,birth_year,position,preferred_foot').eq('id',id).maybeSingle()
 if(!child)notFound()
 const [{data:notes},{data:metrics}]=await Promise.all([
  supabase.from('coach_observations').select('id,body,created_at').eq('child_id',id).order('created_at',{ascending:false}).limit(30),
  supabase.from('child_metrics').select('recorded_at,pace,shooting,passing,dribbling,defending,physical,discipline,visible_to_guardian').eq('child_id',id).order('recorded_at',{ascending:false}).limit(100),
 ])
 async function add(form:FormData){'use server';const {supabase,user}=await requireCoachAccess();const body=z.string().trim().min(2).max(2000).parse(form.get('body'));const {error}=await supabase.from('coach_observations').insert({child_id:id,author_id:user.id,body});if(error)throw new Error('No se pudo guardar la observación');revalidatePath(`/coach/jugadores/${id}`)}
 return <div className="mx-auto max-w-3xl space-y-5 p-5"><h1 className="text-2xl font-bold text-navy">{child.full_name}</h1><p>Año: {child.birth_year} · {child.position||'Posición sin definir'} · {child.preferred_foot||'Pierna sin definir'}</p><PlayerEvaluationEditor key={id} childId={id} evaluations={(metrics || []) as PlayerEvaluation[]} /><section className="rounded-xl border bg-white p-4"><h2 className="font-bold">Observaciones del equipo técnico</h2><p className="mb-3 text-sm text-slate-500">Internas para coordinación y entrenadores asignados. No incluir información económica.</p><form action={add} className="space-y-3"><Textarea name="body" minLength={2} maxLength={2000} required/><Button>Guardar observación</Button></form>{notes?.map(n=><div key={n.id} className="mt-4 border-t pt-3"><p className="text-xs text-slate-500">{new Date(n.created_at).toLocaleDateString('es-ES')}</p><p className="whitespace-pre-wrap text-sm">{n.body}</p></div>)}</section></div>
}
