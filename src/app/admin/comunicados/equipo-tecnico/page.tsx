import Link from 'next/link'
import {requireAdmin} from '@/lib/auth'
import {z} from 'zod'
import {revalidatePath} from 'next/cache'
import {Button} from '@/components/ui/button'
import {Input} from '@/components/ui/input'
import {Textarea} from '@/components/ui/textarea'
export default async function TeamNotices(){
 const {supabase}=await requireAdmin()
 const [{data:teams},{data:notes,error}]=await Promise.all([supabase.from('teams').select('id,name').order('name'),supabase.from('team_notices').select('id,title,body,created_at,team:teams(name)').order('created_at',{ascending:false}).limit(50)])
 async function publish(form:FormData){'use server';const {supabase,user}=await requireAdmin();const p=z.object({team:z.string().uuid(),title:z.string().trim().min(3).max(150),body:z.string().trim().min(2).max(3000)}).parse(Object.fromEntries(form));const {error}=await supabase.from('team_notices').insert({team_id:p.team,title:p.title,body:p.body,author_id:user.id});if(error)throw Error('No se pudo publicar');revalidatePath('/admin/comunicados/equipo-tecnico');revalidatePath('/coach/comunicados')}
 return <div className="mx-auto max-w-3xl space-y-5"><Link href="/admin/comunicados" className="underline">Volver a comunicados</Link><h1 className="text-2xl font-bold">Avisos al equipo técnico</h1><p>Solo los administradores y el entrenador activo asignado al equipo pueden leerlos. No se envían a familias, por email ni WhatsApp. No incluyas información económica.</p><form action={publish} className="space-y-3 rounded-xl border bg-white p-4"><label className="block">Equipo<select name="team" required className="block w-full rounded border p-3"><option value="">Selecciona un equipo</option>{teams?.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select></label><label className="block">Asunto<Input name="title" minLength={3} maxLength={150} required/></label><label className="block">Mensaje<Textarea name="body" minLength={2} maxLength={3000} required/></label><Button>Publicar aviso interno</Button></form>{error?<p>No se pudieron cargar los avisos.</p>:notes?.map(n=><article key={n.id} className="rounded-xl border bg-white p-4"><h2 className="font-bold">{n.title}</h2><p className="text-xs text-slate-500">{(n.team as unknown as {name:string})?.name} · {new Date(n.created_at).toLocaleDateString('es-ES')}</p><p className="whitespace-pre-wrap">{n.body}</p></article>)}</div>
}
