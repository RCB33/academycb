import { createClient } from '@/lib/supabase/server'
import { CommunityComposer } from '@/components/portal/community-composer'
import { Camera, Heart, Image as ImageIcon, LockKeyhole, Play, ShieldCheck, Sparkles } from 'lucide-react'

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
        <header className="relative overflow-hidden rounded-3xl bg-navy px-6 py-8 text-white shadow-2xl shadow-navy/20 sm:px-8"><div className="absolute -right-16 -top-20 h-56 w-56 rounded-full border border-gold/25" /><div className="absolute -bottom-24 right-24 h-40 w-40 rounded-full bg-gold/10 blur-3xl" /><div className="relative"><p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-gold"><Sparkles className="h-4 w-4" />Comunidad privada</p><h1 className="mt-3 font-heading text-4xl font-black uppercase leading-none sm:text-5xl">Muro <span className="text-gold">Academy</span></h1><p className="mt-4 max-w-xl text-sm leading-relaxed text-slate-200 sm:text-base">Los momentos que hacen crecer a nuestros jugadores: esfuerzo, aprendizaje, compañerismo y logros compartidos.</p></div></header>
        <div className="flex gap-3 rounded-2xl border border-gold/35 bg-gold/10 p-4 text-sm text-navy"><ShieldCheck className="h-5 w-5 shrink-0 text-gold" /><p>Un espacio solo para familias Academy. Comparte con respeto; Academy puede retirar contenido para cuidar a la comunidad.</p></div>
        <CommunityComposer children={children} />
        <section className="space-y-4"><div className="flex items-center gap-3 px-1"><span className="h-px flex-1 bg-navy/10" /><h2 className="font-heading text-xl font-black uppercase text-navy">Últimos logros</h2><span className="h-px flex-1 bg-navy/10" /></div>{renderedPosts.length === 0 ? <div className="rounded-3xl border border-dashed border-navy/20 bg-white p-10 text-center shadow-sm"><div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gold/15 text-gold"><Camera className="h-6 w-6" /></div><p className="mt-4 font-bold text-navy">Aún no hay publicaciones</p><p className="mt-1 text-sm text-slate-500">¡Comparte el primer logro Academy!</p></div> : renderedPosts.map((post) => <article key={post.id} className="overflow-hidden rounded-3xl border border-navy/10 bg-white shadow-lg shadow-navy/5"><div className="flex items-center gap-3 p-5"><div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${post.child_id ? 'bg-gold text-navy' : 'bg-navy text-gold'}`}>{post.child_id ? <Heart className="h-5 w-5" /> : <Sparkles className="h-5 w-5" />}</div><div className="min-w-0 flex-1"><p className="font-bold text-navy">{post.child_id ? (post.author_user_id === user?.id ? 'Mi jugador' : 'Familia Academy') : 'Academy Costa Brava'}</p><p className="text-xs text-slate-500">{new Date(post.published_at || post.created_at).toLocaleDateString('es-ES')}</p></div>{post.visibility === 'private' && <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold uppercase text-slate-500"><LockKeyhole className="h-3 w-3" />Privado</span>}</div><p className="whitespace-pre-wrap px-5 pb-5 text-[15px] leading-relaxed text-slate-700">{post.body}</p>{post.mediaUrl && (post.media_type === 'image' ? <img src={post.mediaUrl} alt="Publicación de la comunidad" className="max-h-[34rem] w-full object-cover" /> : <div className="relative bg-navy"><Play className="pointer-events-none absolute left-5 top-5 z-10 h-10 w-10 rounded-full bg-gold p-2 text-navy" /><video className="w-full" controls src={post.mediaUrl}><track kind="captions" /></video></div>)}<div className="flex items-center gap-2 border-t border-navy/10 px-5 py-3 text-xs font-medium text-slate-500"><ImageIcon className="h-4 w-4 text-gold" />Logro compartido en la Comunidad Academy</div></article>)}</section>
    </div>
}
