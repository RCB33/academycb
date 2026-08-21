'use client'

import { useState, useTransition } from 'react'
import { Check, MessageSquareHeart, Send, X } from 'lucide-react'
import { createAcademyWallPost, moderateCommunityPost } from '@/app/actions/community-wall'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'

export function WallModeration({ initialPosts }: { initialPosts: any[] }) {
    const [posts, setPosts] = useState(initialPosts)
    const [pending, startTransition] = useTransition()
    const review = (id: string, status: 'published' | 'rejected') => startTransition(async () => {
        const result = await moderateCommunityPost(id, status)
        if (!result.success) { toast.error(result.error || 'No se pudo moderar'); return }
        toast.success(status === 'published' ? 'Publicación aprobada' : 'Publicación rechazada')
        setPosts((current) => current.map((post) => post.id === id ? { ...post, status } : post))
    })
    return <div className="space-y-6"><header><p className="text-xs font-bold uppercase tracking-[0.18em] text-gold">Comunicación</p><h1 className="mt-1 flex items-center gap-3 text-3xl font-black text-slate-900"><MessageSquareHeart className="h-8 w-8 text-gold" />Muro Academy</h1><p className="mt-2 text-sm text-slate-500">Aprueba las publicaciones de familias antes de que aparezcan dentro del Portal Familias.</p></header>
        <Card><CardHeader><CardTitle>Publicar como Academy</CardTitle><CardDescription>Este mensaje se publica directamente en el muro privado.</CardDescription></CardHeader><CardContent><form action={async (formData) => { const result = await createAcademyWallPost(formData); if (!result.success) toast.error(result.error || 'No se pudo publicar'); else toast.success('Mensaje publicado en el Muro Academy') }}><Textarea required name="body" minLength={2} maxLength={1500} placeholder="Comparte una novedad, felicitación o aviso para las familias…" /><Button className="mt-3 bg-gold font-bold text-navy hover:bg-gold/80"><Send className="mr-2 h-4 w-4" />Publicar</Button></form></CardContent></Card>
        <section className="grid gap-4 lg:grid-cols-2">{posts.filter((post) => post.status === 'pending').map((post) => <Card key={post.id} className="border-amber-200"><CardHeader className="pb-2"><CardTitle className="text-lg">Publicación pendiente</CardTitle><CardDescription>{new Date(post.created_at).toLocaleString('es-ES')} · {post.visibility === 'private' ? 'Privada' : 'Comunidad Academy'}</CardDescription></CardHeader><CardContent><p className="whitespace-pre-wrap text-sm text-slate-700">{post.body}</p>{post.media_path && <p className="mt-3 text-xs font-medium text-slate-500">Incluye {post.media_type === 'video' ? 'un vídeo' : 'una imagen'}.</p>}<div className="mt-4 flex gap-2"><Button disabled={pending} onClick={() => review(post.id, 'published')} className="bg-emerald-600 hover:bg-emerald-700"><Check className="mr-1 h-4 w-4" />Aprobar</Button><Button disabled={pending} variant="outline" onClick={() => review(post.id, 'rejected')} className="text-red-600"><X className="mr-1 h-4 w-4" />Rechazar</Button></div></CardContent></Card>)}</section>
        {posts.filter((post) => post.status === 'pending').length === 0 && <Card><CardContent className="py-10 text-center text-sm text-slate-500">No hay publicaciones pendientes de moderación.</CardContent></Card>}
    </div>
}
