import Link from 'next/link'
import { z } from 'zod'
import { CommunityCaption } from '@/components/portal/community-caption'
import { CommunityInteractions } from '@/components/portal/community-interactions'
import { getPortalViewer } from '@/lib/admin-view'

import { imageConsentOptions } from '@/lib/image-consent'
import { getT } from '@/lib/i18n/server'
import { CommunityComposer } from '@/components/portal/community-composer'
import { CommunityStories, type CommunityStory } from '@/components/portal/community-stories'
import { deleteOwnCommunityPostFromForm } from '@/app/actions/community-wall'
import { Camera, Heart, LockKeyhole, MoreHorizontal, Play, ShieldCheck, Sparkles, Trash2 } from 'lucide-react'


export default async function CommunityWallPage({ postId }: { postId?: string } = {}) {
    const translate = await getT()

    const { supabase, user, view } = await getPortalViewer()
    const { data: guardian } = await supabase.from('guardians').select('id').eq('user_id', user?.id || '').maybeSingle()
    const [{ data: childLinks }, { data: imageConsents }] = guardian ? await Promise.all([
        supabase.from('child_guardians').select('child:children(id, full_name)').eq('guardian_id', guardian.id),
        supabase.from('signatures').select('child_id, consent_options').eq('guardian_id', guardian.id).eq('document_type', 'Autorización de imagen y vídeo').order('signed_at', { ascending: false }).order('id', { ascending: false }),
    ]) : [{ data: [] }, { data: [] }]

    const children = (childLinks || []).map((link: any) => link.child).filter(Boolean).map((child: any) => {
        const consent = (imageConsents || []).find((item: any) => item.child_id === child.id)
        return { ...child, can_share_media: imageConsentOptions(consent?.consent_options).portal_internal, consent_options: imageConsentOptions(consent?.consent_options) }
    }) as { id: string; full_name: string; can_share_media: boolean; consent_options: { portal_internal: boolean; public_communications: boolean } }[]
    const childNames = new Map(children.map((child) => [child.id, child.full_name]))
    if(postId && !z.string().uuid().safeParse(postId).success) return <p>Publicación no disponible.</p>
    let postQuery = supabase.from('community_posts').select('*')
    if(postId) postQuery = postQuery.eq('id',postId)
    if (view && user) postQuery = postQuery.or(`author_user_id.eq.${user.id},and(visibility.eq.community,status.eq.published)`)
    const { data: allPosts } = await postQuery.order('published_at', { ascending: false }).order('created_at', { ascending: false }).limit(50)

    const posts = (allPosts || []).filter(post => !view || post.author_user_id === user?.id || (post.visibility === 'community' && post.status === 'published'))
    const socialIds = posts.filter(p => p.status === 'published' && p.visibility === 'community').map(p => p.id)
    const { data: social, error: socialError } = socialIds.length ? await supabase.rpc('community_post_engagement', { post_ids: socialIds }) : { data: [], error: null }
    const engagement = new Map<string, {likes:number;liked:boolean;comments:number}>((social || []).map((s: {post_id:string;likes:number;liked:boolean;comments:number}) => [s.post_id, {likes:Number(s.likes),liked:view ? false : s.liked,comments:Number(s.comments)}]))
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
            <div className="relative"><p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-gold"><Sparkles className="h-4 w-4" />{translate("Comunidad privada")}</p><h1 className="mt-3 font-heading text-4xl font-black uppercase leading-none sm:text-5xl">{translate("Muro ")}<span className="text-gold">{translate("Academy")}</span></h1><p className="mt-4 max-w-xl text-sm leading-relaxed text-slate-200 sm:text-base">{translate("Los momentos que hacen crecer a nuestros jugadores: esfuerzo, aprendizaje, compañerismo y logros compartidos.")}</p></div>
        </header>
        <div className="flex gap-3 rounded-2xl border border-gold/35 bg-gold/10 p-4 text-sm text-navy"><ShieldCheck className="h-5 w-5 shrink-0 text-gold" /><p>{translate("Un espacio privado para familias Academy. Comparte con respeto; Academy puede retirar contenido para cuidar la comunidad.")}</p></div>
        {postId ? <Link href="/portal/muro" className="inline-block py-3 font-bold text-navy underline">← {translate('Volver al Muro Academy')}</Link> : <CommunityStories stories={stories} />}
        {!postId && <section id="compartir-logro"><CommunityComposer viewOnly={Boolean(view)} players={children} guardianId={guardian?.id} /></section>}
        <section className="space-y-4" aria-labelledby="feed-title">
            <div className="flex items-center gap-3 px-1"><span className="h-px flex-1 bg-navy/10" /><h2 id="feed-title" className="font-heading text-xl font-black uppercase text-navy">{translate("Publicaciones recientes")}</h2><span className="h-px flex-1 bg-navy/10" /></div>
            {translate(renderedPosts.length === 0 ? <div className="rounded-[1.75rem] border border-dashed border-navy/20 bg-white p-10 text-center shadow-sm"><div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gold/15 text-gold"><Camera className="h-6 w-6" /></div><p className="mt-4 font-bold text-navy">{translate(postId ? 'Publicación no disponible' : 'Aún no hay publicaciones')}</p><p className="mt-1 text-sm text-slate-500">{translate(postId ? 'Puede haberse retirado o no estar disponible para tu cuenta.' : 'Elige un jugador, comparte un logro y estrenad el muro.')}</p></div> : renderedPosts.map((post) => <article key={post.id} id={`post-${post.id}`} className="scroll-mt-6 overflow-hidden rounded-[1.75rem] border border-navy/10 bg-white shadow-lg shadow-navy/5">
                <div className="flex items-center gap-3 p-5"><div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${post.child_id ? 'bg-gold text-navy' : 'bg-navy text-gold'}`}>{translate(post.child_id ? <Heart className="h-5 w-5" /> : <Sparkles className="h-5 w-5" />)}</div><div className="min-w-0 flex-1"><p className="truncate font-bold text-navy">{translate(post.author)}</p><p className="text-xs text-slate-500">{translate(new Date(post.published_at || post.created_at).toLocaleDateString(translate.locale, { day: 'numeric', month: 'long', year: 'numeric' }))} {translate(" · Muro Academy")}</p></div>{translate(post.isOwn ? <form action={deleteOwnCommunityPostFromForm.bind(null, post.id)}><button type="submit" className="inline-flex h-9 items-center gap-1.5 rounded-lg px-2 text-xs font-bold text-slate-500 transition hover:bg-red-50 hover:text-red-600" title={translate("Eliminar mi publicación")}><Trash2 className="h-4 w-4" />{translate("Eliminar")}</button></form> : post.visibility === 'private' ? <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold uppercase text-slate-500"><LockKeyhole className="h-3 w-3" />{translate("Privado")}</span> : <MoreHorizontal className="h-5 w-5 shrink-0 text-slate-400" />)}</div>
                {translate(post.mediaUrl && (post.media_type === 'image' ? <img src={post.mediaUrl} alt={translate("Publicación de la comunidad")} className="max-h-[38rem] w-full object-cover" /> : <div className="relative bg-navy"><Play className="pointer-events-none absolute left-5 top-5 z-10 h-10 w-10 rounded-full bg-gold p-2 text-navy" /><video className="w-full" controls playsInline src={post.mediaUrl}><track kind="captions" /></video></div>))}
                <CommunityCaption body={post.body} />
                {post.visibility === 'community' && post.status === 'published' && engagement.has(post.id) ? <CommunityInteractions postId={post.id} initial={engagement.get(post.id)!} viewOnly={Boolean(view)}/> : <p className="border-t px-5 py-3 text-xs text-slate-500">{translate(socialError ? 'No se pudieron cargar las interacciones. Recarga para volver a intentarlo.' : 'Solo las publicaciones compartidas con la comunidad admiten me gusta y comentarios.')}</p>}
            </article>))}
        </section>
    </div>
}
