'use client'

import { useState, useTransition } from 'react'
import { MessageSquareHeart, Send, Trash2 } from 'lucide-react'
import { createAcademyWallPost, deleteCommunityPost } from '@/app/actions/community-wall'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'

export function WallModeration({ initialPosts }: { initialPosts: any[] }) {
    const [posts, setPosts] = useState(initialPosts)
    const [pending, startTransition] = useTransition()
    const removePost = (id: string) => {
        if (!confirm('¿Eliminar esta publicación del Muro Academy?')) return
        startTransition(async () => {
            const result = await deleteCommunityPost(id)
            if (!result.success) { toast.error(result.error || 'No se pudo eliminar'); return }
            setPosts((current) => current.filter((post) => post.id !== id))
            toast.success('Publicación eliminada')
        })
    }
    return <div className="space-y-6"><header><p className="text-xs font-bold uppercase tracking-[0.18em] text-gold">Comunicación</p><h1 className="mt-1 flex items-center gap-3 text-3xl font-black text-slate-900"><MessageSquareHeart className="h-8 w-8 text-gold" />Muro Academy</h1><p className="mt-2 text-sm text-slate-500">Espacio privado donde las familias comparten logros deportivos. Academy mantiene el control para eliminar contenido cuando sea necesario.</p></header>
        <Card><CardHeader><CardTitle>Publicar como Academy</CardTitle><CardDescription>Comparte una felicitación, novedad o aviso directamente con las familias.</CardDescription></CardHeader><CardContent><form action={async (formData) => { const result = await createAcademyWallPost(formData); if (!result.success) toast.error(result.error || 'No se pudo publicar'); else toast.success('Mensaje publicado en el Muro Academy') }}><Textarea required name="body" minLength={2} maxLength={1500} placeholder="Comparte una novedad, felicitación o aviso para las familias…" /><Button className="mt-3 bg-gold font-bold text-navy hover:bg-gold/80"><Send className="mr-2 h-4 w-4" />Publicar</Button></form></CardContent></Card>
        <section className="grid gap-4 lg:grid-cols-2">{posts.map((post) => <Card key={post.id}><CardHeader className="pb-2"><div className="flex items-start justify-between gap-3"><div><CardTitle className="text-lg">{post.child_id ? 'Logro de familia' : 'Academy Costa Brava'}</CardTitle><CardDescription>{new Date(post.created_at).toLocaleString('es-ES')} · {post.visibility === 'private' ? 'Privada' : 'Comunidad Academy'}</CardDescription></div><Button disabled={pending} size="icon" variant="ghost" className="shrink-0 text-red-600 hover:bg-red-50 hover:text-red-700" aria-label="Eliminar publicación" onClick={() => removePost(post.id)}><Trash2 className="h-4 w-4" /></Button></div></CardHeader><CardContent><p className="whitespace-pre-wrap text-sm text-slate-700">{post.body}</p>{post.media_path && <p className="mt-3 text-xs font-medium text-slate-500">Incluye {post.media_type === 'video' ? 'un vídeo' : 'una imagen'}.</p>}</CardContent></Card>)}</section>
        {posts.length === 0 && <Card><CardContent className="py-10 text-center text-sm text-slate-500">Aún no hay publicaciones en el muro.</CardContent></Card>}
    </div>
}
