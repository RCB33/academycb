import { createClient } from '@/lib/supabase/server'
import { CommunityComposer } from '@/components/portal/community-composer'
import { CommunityStories, type CommunityStory } from '@/components/portal/community-stories'
import { deleteOwnCommunityPostFromForm } from '@/app/actions/community-wall'
import { Camera, Heart, Image as ImageIcon, LockKeyhole, MoreHorizontal, Play, ShieldCheck, Sparkles, Trash2 } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function CommunityWallPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const { data: guardian } = await supabase.from('guardians').select('id').eq('user_id', user?.id || '').maybeSingle()
    const [{ data: childLinks }, { data: imageConsents }] = guardian ? await Promise.all([
        supabase.from('child_guardians').select('child:children(id, full_name)').eq('guardian_id', guardian.id),
        supabase.from('signatures').select('child_id, consent_options').eq('guardian_id', guardian.id).eq('document_type', 'Autorización de imagen y vídeo').order('signed_at', { ascending: false }),
    ]) : [{ data: [] }, { data: [] }]

    const children = (childLinks || []).map((link: any) => link.child).filter(Boolean).map((child: any) => {
        const consent = (imageConsents || []).find((item: any) => item.child_id === child.id)
        return { ...child, can_share_media: Boolean(consent?.consent_options?.portal_internal) }
    }) as { id: string; full_name: string; can_share_media: boolean }[]
    const childNames = new Map(children.map((child) => [child.id, child.full_name]))
    const { data: posts } = await supabase.from('community_posts').select('*').order('published_at', { ascending: false }).order('created_at', { ascending: false }).limit(50)

    const renderedPosts = await Promise.all((posts || []).map(async (post) => {
        let mediaUrl: string | null = null
        if (post.media_path) {
            const { data } = await supabase.storage.from('community-wall').createSignedUrl(post.media_path, 900)
            mediaUrl = data?.signedUrl || null
        }
        const author = post.child_id
            ? (post.author_user_id === user?.id ? childNames.get(post.child_id) || 'Mi jugador' : 'Familia Academy')
            : 'Academy Costa Brava'
        return { ...post, mediaUrl, author, isOwn: post.author_user_id === user?.id }
    }))
    const stories: CommunityStory[] = renderedPosts
        .filter((post) => post.visibility === 'community' && post.status === 'published')
        .slice(0, 12)
        .map((post) => ({ id: post.id, author: post.author, body: post.body, createdAt: post.published_at || post.created_at, mediaUrl: post.mediaUrl, mediaType: post.media_type }))

    return <div className="mx-auto max-w-3xl space-y-6 pb-10">
        <header className="relative overflow-hidden rounded-[2rem] bg-navy px-6 py-8 text-white shadow-2xl shadow-navy/20 sm:px-8 sm:py-10">
            <div className="absolute -right-16 -top-20 h-56 w-56 rounded-full border border-gold/25" /><div className="absolute -bottom-24 right-24 h-40 w-40 rounded-full bg-gold/10 blur-3xl" />
            <div className="relative"><p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-gold"><Sparkles className="h-4 w-4" />Comunidad privada</p><h1 className="mt-3 font-heading text-4xl font-black uppercase leading-none sm:text-5xl">Muro <span className="text-gold">Academy</span></h1><p className="mt-4 max-w-xl text-sm leading-relaxed text-slate-200 sm:text-base">Los momentos que hacen crecer a nuestros jugadores: esfuerzo, aprendizaje, compañerismo y logros compartidos.</p></div>
        </header>
        <div className="flex gap-3 rounded-2xl border border-gold/35 bg-gold/10 p-4 text-sm text-navy"><ShieldCheck className="h-5 w-5 shrink-0 text-gold" /><p>Un espacio privado para familias Academy. Comparte con respeto; Academy puede retirar contenido para cuidar la comunidad.</p></div>
        <CommunityStories stories={stories} />
        <section id="compartir-logro"><CommunityComposer players={children} /></section>
        <section className="space-y-4" aria-labelledby="feed-title">
            <div className="flex items-center gap-3 px-1"><span className="h-px flex-1 bg-navy/10" /><h2 id="feed-title" className="font-heading text-xl font-black uppercase text-navy">Publicaciones recientes</h2><span className="h-px flex-1 bg-navy/10" /></div>
            {renderedPosts.length === 0 ? <div className="rounded-[1.75rem] border border-dashed border-navy/20 bg-white p-10 text-center shadow-sm"><div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gold/15 text-gold"><Camera className="h-6 w-6" /></div><p className="mt-4 font-bold text-navy">Aún no hay publicaciones</p><p className="mt-1 text-sm text-slate-500">Elige un jugador, comparte un logro y estrenad el muro.</p></div> : renderedPosts.map((post) => <article key={post.id} className="overflow-hidden rounded-[1.75rem] border border-navy/10 bg-white shadow-lg shadow-navy/5">
                <div className="flex items-center gap-3 p-5"><div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${post.child_id ? 'bg-gold text-navy' : 'bg-navy text-gold'}`}>{post.child_id ? <Heart className="h-5 w-5" /> : <Sparkles className="h-5 w-5" />}</div><div className="min-w-0 flex-1"><p className="truncate font-bold text-navy">{post.author}</p><p className="text-xs text-slate-500">{new Date(post.published_at || post.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })} · Muro Academy</p></div>{post.isOwn ? <form action={deleteOwnCommunityPostFromForm.bind(null, post.id)}><button type="submit" className="inline-flex h-9 items-center gap-1.5 rounded-lg px-2 text-xs font-bold text-slate-500 transition hover:bg-red-50 hover:text-red-600" title="Eliminar mi publicación"><Trash2 className="h-4 w-4" />Eliminar</button></form> : post.visibility === 'private' ? <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold uppercase text-slate-500"><LockKeyhole className="h-3 w-3" />Privado</span> : <MoreHorizontal className="h-5 w-5 shrink-0 text-slate-400" />}</div>
                <p className="whitespace-pre-wrap px-5 pb-5 text-[15px] leading-relaxed text-slate-700">{post.body}</p>
                {post.mediaUrl && (post.media_type === 'image' ? <img src={post.mediaUrl} alt="Publicación de la comunidad" className="max-h-[38rem] w-full object-cover" /> : <div className="relative bg-navy"><Play className="pointer-events-none absolute left-5 top-5 z-10 h-10 w-10 rounded-full bg-gold p-2 text-navy" /><video className="w-full" controls playsInline src={post.mediaUrl}><track kind="captions" /></video></div>)}
                <div className="flex items-center gap-2 border-t border-navy/10 px-5 py-3 text-xs font-medium text-slate-500"><ImageIcon className="h-4 w-4 text-gold" />Logro compartido en la Comunidad Academy</div>
            </article>)}
        </section>
    </div>
}
