'use client'

import { useRef, useState, useTransition } from 'react'
import { ImagePlus, Loader2, Send, ShieldCheck, Sparkles } from 'lucide-react'
import { createCommunityPost } from '@/app/actions/community-wall'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

export function CommunityComposer({ children }: { children: { id: string; full_name: string }[] }) {
    const formRef = useRef<HTMLFormElement>(null)
    const [pending, startTransition] = useTransition()
    const [message, setMessage] = useState<string | null>(null)
    if (!children.length) return null
    return <form ref={formRef} onSubmit={(event) => {
        event.preventDefault(); setMessage(null)
        const formData = new FormData(event.currentTarget)
        startTransition(async () => {
            const result = await createCommunityPost(formData)
            setMessage(result.success ? '¡Logro compartido! Ya está visible según la privacidad que has elegido.' : result.error || 'No se pudo enviar.')
            if (result.success) formRef.current?.reset()
        })
    }} className="overflow-hidden rounded-3xl border border-navy/10 bg-white shadow-xl shadow-navy/10">
        <div className="flex items-center gap-3 border-b border-navy/10 bg-navy px-5 py-4 text-white"><div className="rounded-xl bg-gold p-2 text-navy"><Sparkles className="h-4 w-4" /></div><div><label className="font-heading text-xl font-black uppercase">Comparte un logro</label><p className="text-xs text-slate-300">Celebra el progreso de tu jugador con Academy.</p></div></div>
        <div className="p-4 sm:p-5"><Textarea name="body" required minLength={2} maxLength={1500} className="min-h-28 border-slate-200 bg-slate-50 text-base shadow-inner focus-visible:ring-gold" placeholder="Por ejemplo: gran partido este fin de semana, primera convocatoria…" />
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <select name="child_id" required className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm"><option value="">Jugador</option>{children.map((child) => <option key={child.id} value={child.id}>{child.full_name}</option>)}</select>
            <select name="visibility" className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm"><option value="community">Comunidad Academy</option><option value="private">Solo mi familia y Academy</option></select>
            <label className="flex h-10 cursor-pointer items-center gap-2 rounded-md border border-dashed border-slate-300 px-3 text-sm text-slate-600"><ImagePlus className="h-4 w-4" /><span className="truncate">Foto o vídeo</span><input name="file" type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime" className="sr-only" /></label>
        </div>
        <p className="mt-3 flex gap-2 text-xs text-slate-500"><ShieldCheck className="h-4 w-4 shrink-0 text-gold" />Comparte solo contenido deportivo apropiado. Academy puede retirar publicaciones que no respeten la comunidad. Máximo 20 MB.</p>
        {message && <p className="mt-3 text-sm font-medium text-navy" role="status">{message}</p>}
        <Button disabled={pending} className="mt-5 h-12 w-full bg-gold font-black text-navy shadow-lg shadow-gold/25 hover:bg-gold-light">{pending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Compartiendo…</> : <><Send className="mr-2 h-4 w-4" /> Compartir logro</>}</Button></div>
    </form>
}
