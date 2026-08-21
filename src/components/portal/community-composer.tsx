'use client'

import { useRef, useState, useTransition } from 'react'
import { ImagePlus, Loader2, Send } from 'lucide-react'
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
    }} className="rounded-2xl border bg-white p-4 shadow-sm">
        <label className="text-sm font-bold text-slate-800">Comparte un logro de tu jugador</label>
        <Textarea name="body" required minLength={2} maxLength={1500} className="mt-2 min-h-24" placeholder="Por ejemplo: gran partido este fin de semana, primera convocatoria…" />
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <select name="child_id" required className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm"><option value="">Jugador</option>{children.map((child) => <option key={child.id} value={child.id}>{child.full_name}</option>)}</select>
            <select name="visibility" className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm"><option value="community">Comunidad Academy</option><option value="private">Solo mi familia y Academy</option></select>
            <label className="flex h-10 cursor-pointer items-center gap-2 rounded-md border border-dashed border-slate-300 px-3 text-sm text-slate-600"><ImagePlus className="h-4 w-4" /><span className="truncate">Foto o vídeo</span><input name="file" type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime" className="sr-only" /></label>
        </div>
        <p className="mt-3 text-xs text-slate-500">Comparte solo contenido deportivo apropiado. Academy puede retirar publicaciones que no respeten la comunidad. Máximo 20 MB.</p>
        {message && <p className="mt-3 text-sm font-medium text-navy" role="status">{message}</p>}
        <Button disabled={pending} className="mt-4 w-full bg-gold font-bold text-navy hover:bg-gold/80">{pending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Compartiendo…</> : <><Send className="mr-2 h-4 w-4" /> Compartir logro</>}</Button>
    </form>
}
