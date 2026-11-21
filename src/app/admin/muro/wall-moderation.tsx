'use client'

import { CommunityInteractions } from '@/components/portal/community-interactions'
import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { MessageSquareHeart, Send, Trash2 } from 'lucide-react'
import { createAcademyWallPost, deleteCommunityPost } from '@/app/actions/community-wall'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'

export function WallModeration({ initialPosts, engagement }: { initialPosts: any[]; engagement: {post_id:string;likes:number;liked:boolean;comments:number}[] }) {
    const router = useRouter()
    const publishing = useRef(false)
    const [removed, setRemoved] = useState<string[]>([])
    const posts = initialPosts.filter(post => !removed.includes(post.id))
    const [pending, startTransition] = useTransition()
    const removePost = (id: string) => {
        if (!confirm('¿Eliminar esta publicación del Muro Academy?')) return
        startTransition(async () => {
            const result = await deleteCommunityPost(id)
            if (!result.success) { toast.error(result.error || 'No se pudo eliminar'); return }
            setRemoved((current) => [...current, id])
            toast.success('Publicación eliminada')
        })
    }
    return <div className="space-y-6"><header><p className="text-xs font-bold uppercase tracking-[0.18em] text-gold">Comunicación</p><h1 className="mt-1 flex items-center gap-3 text-3xl font-black text-slate-900"><MessageSquareHeart className="h-8 w-8 text-gold" />Muro Academy</h1><p className="mt-2 text-sm text-slate-500">Espacio privado donde las familias comparten logros deportivos. Academy mantiene el control para eliminar contenido cuando sea necesario.</p></header>
        <Card><CardHeader><CardTitle>Publicar como Academy</CardTitle><CardDescription>Comparte una felicitación, novedad o aviso directamente con las familias.</CardDescription></CardHeader><CardContent><form onSubmit={(event) => {
            event.preventDefault()
            if (publishing.current) return
            publishing.current = true
            const form = event.currentTarget
            const data = new FormData(form)
            startTransition(async () => {
                try {
                    const result = await createAcademyWallPost(data)
                    if (!result.success) { toast.error(result.error || 'No se pudo publicar'); return }
                    form.reset()
                    toast.success('Mensaje publicado en el Muro Academy')
                    router.refresh()
                } catch { toast.error('No se pudo publicar. Comprueba la conexión y vuelve a intentarlo.') }
                finally { publishing.current = false }
            })
        }}>
            <Textarea required name="body" aria-label="Mensaje para las familias" minLength={2} maxLength={1500} disabled={pending} placeholder="Comparte una novedad, felicitación o aviso para las familias…" />
            <label className="mt-4 block text-sm font-bold text-navy" htmlFor="academy-wall-photo">Añadir una foto (opcional)</label>
            <input id="academy-wall-photo" name="photo" type="file" accept="image/jpeg,image/png,image/webp" disabled={pending} className="mt-2 block w-full rounded-xl border p-3 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:font-semibold" />
            <p className="mt-2 text-xs text-slate-500">JPG, PNG o WebP · Hasta 3 MB. Usa imágenes autorizadas para compartir con las familias.</p>
            <Button disabled={pending} className="mt-3 bg-gold font-bold text-navy hover:bg-gold/80"><Send className="mr-2 h-4 w-4" />{pending ? 'Publicando…' : 'Publicar'}</Button>
        </form></CardContent></Card>
        <section className="grid gap-4 lg:grid-cols-2">{posts.map((post) => <Card key={post.id}><CardHeader className="pb-2"><div className="flex items-start justify-between gap-3"><div><CardTitle className="text-lg">{post.child_id ? 'Logro de familia' : 'Academy Costa Brava'}</CardTitle><CardDescription>{new Date(post.created_at).toLocaleString('es-ES')} · {post.visibility === 'private' ? 'Privada' : 'Comunidad Academy'}</CardDescription></div><Button disabled={pending} size="icon" variant="ghost" className="shrink-0 text-red-600 hover:bg-red-50 hover:text-red-700" aria-label="Eliminar publicación" onClick={() => removePost(post.id)}><Trash2 className="h-4 w-4" /></Button></div></CardHeader><CardContent><p className="whitespace-pre-wrap text-sm text-slate-700">{post.body}</p>{post.media_path && <p className="mt-3 text-xs font-medium text-slate-500">Incluye {post.media_type === 'video' ? 'un vídeo' : 'una imagen'}.</p>}</CardContent>{post.visibility==='community' && engagement.some(e=>e.post_id===post.id) && <CommunityInteractions postId={post.id} moderator initial={engagement.find(e=>e.post_id===post.id)!}/>}</Card>)}</section>
        {posts.length === 0 && <Card><CardContent className="py-10 text-center text-sm text-slate-500">Aún no hay publicaciones en el muro.</CardContent></Card>}
    </div>
}
