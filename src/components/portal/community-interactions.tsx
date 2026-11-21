'use client'
import { useRef, useState, useTransition } from 'react'
import { Heart, MessageCircle, Send, Share2, Trash2, Loader2 } from 'lucide-react'
import { addCommunityComment, deleteCommunityComment, setCommunityLike } from '@/app/actions/community-social'
import { wallPostPath, type WallComment, type WallEngagement } from '@/lib/community-social'
import { useT } from '@/lib/i18n/client'

export function CommunityInteractions({ postId, initial, viewOnly = false, moderator = false }: { postId: string; initial: WallEngagement; viewOnly?: boolean; moderator?: boolean }) {
    const t = useT()
    const [summary, setSummary] = useState(initial)
    const [open, setOpen] = useState(false)
    const [comments, setComments] = useState<WallComment[]>([])
    const [more, setMore] = useState(false)
    const [body, setBody] = useState('')
    const [message, setMessage] = useState('')
    const [fallbackUrl, setFallbackUrl] = useState('')
    const [pending, start] = useTransition()
    const requestId = useRef('')
    const busy = useRef(false)
    function run(action: () => Promise<void>) {
        if (busy.current) return
        busy.current = true
        setMessage('')
        start(async () => { try { await action() } catch { setMessage(t('No se pudo conectar. Inténtalo de nuevo.')) } finally { busy.current = false } })
    }
    async function load(offset = 0) {
        const response = await fetch(`/api/community/posts/${postId}/comments?offset=${offset}`, { cache: 'no-store' })
        const result = await response.json() as Awaited<ReturnType<typeof import('@/app/actions/community-social').getCommunityComments>>
        if (!result.success) { setMessage(result.error); return }
        setSummary(result.engagement)
        setComments(current => offset ? [...new Map([...current, ...result.comments].map(c => [c.id, c])).values()] : result.comments)
        setMore(result.hasMore)
    }
    async function share() {
        const url = window.location.origin + wallPostPath(postId)
        try {
            if (navigator.share) await navigator.share({ title: 'Muro Academy', text: t('Una publicación de la comunidad privada Academy. Entra con tu cuenta para verla.'), url })
            else if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(url); setMessage(t('Enlace copiado. Solo la comunidad Academy puede ver la publicación.')) }
            else setFallbackUrl(url)
        } catch (e) {
            if (!(e instanceof Error && e.name === 'AbortError')) { setFallbackUrl(url); setMessage(t('Copia este enlace privado para compartirlo.')) }
        }
    }
    const button = 'flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl px-2 text-xs font-semibold sm:flex-row sm:gap-2 sm:text-sm transition hover:bg-slate-100 disabled:opacity-50'
    return <div className="border-t border-navy/10 px-4 py-3 sm:px-5">
        <div className="grid grid-cols-3 gap-1">
            <button type="button" aria-pressed={summary.liked} disabled={pending || viewOnly} onClick={() => run(async () => { const result = await setCommunityLike(postId, !summary.liked); if (result.success) setSummary(result.engagement); else setMessage(result.error) })} className={`${button} ${summary.liked ? 'text-rose-600' : 'text-slate-600'}`}><Heart className={`h-5 w-5 shrink-0 ${summary.liked ? 'fill-current' : ''}`} /><span>{t('Me gusta')} <span>{summary.likes}</span></span></button>
            <button type="button" aria-expanded={open} aria-controls={`comments-${postId}`} disabled={pending} onClick={() => { if(open) setOpen(false); else { setOpen(true); run(() => load()) } }} className={`${button} text-slate-600`}><MessageCircle className="h-5 w-5 shrink-0"/><span>{t('Comentar')} {summary.comments}</span></button>
            <button type="button" onClick={() => void share()} className={`${button} text-slate-600`}><Share2 className="h-5 w-5 shrink-0"/><span>{t('Compartir')}</span></button>
        </div>
        {message && <p role="status" className="mt-3 rounded-lg bg-slate-50 p-3 text-sm text-slate-700">{t(message)}</p>}
        {fallbackUrl && <label className="mt-3 block text-sm">{t('Enlace privado')}<input aria-label={t('Enlace privado')} readOnly value={fallbackUrl} onFocus={e => e.target.select()} className="mt-1 w-full rounded-lg border p-3 text-base"/></label>}
        {open && <section id={`comments-${postId}`} className="mt-4 space-y-3 border-t pt-4" aria-label={t('Comentarios')}>
            <p className="text-xs text-slate-500">{t('Comenta con respeto. Se mostrará tu nombre de pila. Academy puede retirar comentarios.')}</p>
            {!viewOnly && <form className="flex items-end gap-2" onSubmit={e => { e.preventDefault(); run(async () => { if (!requestId.current) requestId.current = crypto.randomUUID(); const result = await addCommunityComment(postId, requestId.current, body); if (!result.success) { setMessage(result.error); return } setBody(''); requestId.current = ''; await load() }) }}>
                <label className="min-w-0 flex-1"><span className="sr-only">{t('Escribe un comentario')}</span><textarea required maxLength={600} disabled={pending} value={body} onChange={e => { setBody(e.target.value); requestId.current = '' }} placeholder={t('Celebra su logro o deja unas palabras de ánimo…')} className="min-h-20 w-full resize-y rounded-xl border border-slate-200 p-3 text-base"/></label>
                <button type="submit" disabled={pending || !body.trim()} aria-label={t('Publicar comentario')} className="mb-1 flex min-h-11 min-w-11 items-center justify-center rounded-xl bg-gold text-navy disabled:opacity-50">{pending ? <Loader2 className="h-5 w-5 animate-spin"/> : <Send className="h-5 w-5"/>}</button>
            </form>}
            {viewOnly && <p className="text-xs text-slate-500">{t('Vista de consulta. Las interacciones se realizan desde la cuenta de cada familia.')}</p>}
            {comments.map(c => <article key={c.id} className="rounded-xl bg-slate-50 p-3"><div className="flex items-center gap-2"><strong className="flex-1 text-sm text-navy">{c.isOwn ? t('Tú') : c.author_name}</strong><time className="text-xs text-slate-500" dateTime={c.created_at}>{new Date(c.created_at).toLocaleDateString(t.locale)}</time>{!viewOnly && (c.isOwn || moderator) && <button type="button" aria-label={t('Eliminar comentario')} disabled={pending} onClick={() => { if(window.confirm(t('¿Eliminar este comentario?'))) run(async () => { const result = await deleteCommunityComment(c.id); if(!result.success) { setMessage(result.error); return } await load() }) }} className="flex min-h-11 min-w-11 items-center justify-center rounded-lg text-slate-500 hover:bg-red-50 hover:text-red-600"><Trash2 className="h-4 w-4"/></button>}</div><p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-700">{c.body}</p></article>)}
            {!comments.length && !pending && <p className="py-2 text-sm text-slate-500">{t('Sé el primero en comentar este logro.')}</p>}
            {more && <button type="button" disabled={pending} onClick={() => run(() => load(comments.length))} className="min-h-11 text-sm font-bold text-navy underline">{t('Ver más comentarios')}</button>}
        </section>}
    </div>
}
