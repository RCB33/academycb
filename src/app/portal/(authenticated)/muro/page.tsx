import { createClient } from '@/lib/supabase/server'
import { CommunityComposer } from '@/components/portal/community-composer'
import { Heart, ShieldCheck } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function CommunityWallPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const { data: guardian } = await supabase.from('guardians').select('id').eq('user_id', user?.id || '').maybeSingle()
    const { data: childLinks } = guardian ? await supabase.from('child_guardians').select('child:children(id, full_name)').eq('guardian_id', guardian.id) : { data: [] }
    const children = (childLinks || []).map((link: any) => link.child).filter(Boolean) as { id: string; full_name: string }[]
    const { data: posts } = await supabase.from('community_posts').select('*').order('published_at', { ascending: false }).order('created_at', { ascending: false }).limit(50)

    const renderedPosts = await Promise.all((posts || []).map(async (post) => {
        if (!post.media_path) return { ...post, mediaUrl: null }
        const { data } = await supabase.storage.from('community-wall').createSignedUrl(post.media_path, 900)
        return { ...post, mediaUrl: data?.signedUrl || null }
    }))

    return <div className="mx-auto max-w-3xl space-y-6 pb-8">
        <header><p className="text-xs font-bold uppercase tracking-[0.18em] text-gold">Comunidad privada</p><h1 className="mt-1 text-3xl font-black text-navy">Muro Academy</h1><p className="mt-2 text-sm text-slate-600">Comparte logros de tus jugadores con la comunidad Academy. Nunca se publica nada fuera del portal.</p></header>
        <div className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><ShieldCheck className="h-5 w-5 shrink-0" /><p>Es un espacio privado y deportivo: comparte logros con respeto. Academy puede retirar cualquier publicación para proteger a la comunidad.</p></div>
        <CommunityComposer children={children} />
        <section className="space-y-4">{renderedPosts.length === 0 ? <div className="rounded-2xl border border-dashed bg-white p-10 text-center text-sm text-slate-500">Aún no hay publicaciones. ¡Comparte el primer logro Academy!</div> : renderedPosts.map((post) => <article key={post.id} className="rounded-2xl border bg-white p-5 shadow-sm"><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-full bg-navy text-white"><Heart className="h-4 w-4" /></div><div><p className="font-bold text-navy">{post.child_id ? (post.author_user_id === user?.id ? 'Mi jugador' : 'Familia Academy') : 'Academy Costa Brava'}</p><p className="text-xs text-slate-500">{new Date(post.published_at || post.created_at).toLocaleDateString('es-ES')}</p></div></div><p className="mt-4 whitespace-pre-wrap text-slate-700">{post.body}</p>{post.mediaUrl && (post.media_type === 'image' ? <img src={post.mediaUrl} alt="Publicación de la comunidad" className="mt-4 max-h-[28rem] w-full rounded-xl object-cover" /> : <video className="mt-4 w-full rounded-xl" controls src={post.mediaUrl}><track kind="captions" /></video>)}</article>)}</section>
    </div>
}
