'use client'
import { useViewOnly } from '@/components/admin/view-only'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Camera, Loader2, UserCircle } from 'lucide-react'
import { useT } from '@/lib/i18n/client'
import { profileImageUrl } from '@/lib/profile-image'
import { savePlayerPhoto } from '@/app/actions/player-photo'

export function PlayerPhotoEditor({ childId, name, avatarUrl, variant = 'avatar' }: { variant?: 'avatar' | 'card'; childId: string; name: string; avatarUrl?: string | null }) {
    const viewOnly = useViewOnly()
    const t = useT(), router = useRouter()
    const [pending, start] = useTransition()
    const [error, setError] = useState('')
    const [savedUrl, setSavedUrl] = useState<string>()
    const src = profileImageUrl(savedUrl || avatarUrl)
    return <label className={`group/photo relative flex cursor-pointer flex-col items-center gap-2 ${variant==='card'?'h-full w-full':'shrink-0'} ${pending?'pointer-events-none opacity-60':''}`}>
        <span className="sr-only">{t('Foto de')} {name}</span>
        <div className={variant==='card'?'flex h-full min-h-40 w-full items-center justify-center overflow-hidden rounded-xl text-gold':'flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl border border-gold/30 bg-gold/10 text-gold'}>
            {src ? <img src={src} alt={name} className="h-full w-full object-cover" /> : <UserCircle className="h-12 w-12" />}
        </div>
        <span className={`inline-flex min-h-10 items-center gap-1 rounded-lg border bg-white px-2 text-xs font-semibold text-navy ${variant==='card'?'absolute bottom-2 z-30 shadow-lg':''}`}>
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}{t(src ? 'Cambiar foto' : 'Añadir foto')}
            <input type="file" accept="image/jpeg,image/png,image/webp" aria-label={`${t('Foto de')} ${name}`} disabled={pending || viewOnly} className="absolute inset-0 z-40 h-full w-full cursor-pointer opacity-0" onChange={event => {
                const file = event.target.files?.[0]; event.target.value = ''; if (!file) return
                setError('')
                if (file.size > 3 * 1024 * 1024) { setError(t('La foto supera los 3 MB. Reduce su tamaño antes de subirla.')); return }
                start(async () => {
                    try {
                        const form = new FormData(); form.set('childId', childId); form.set('file', file)
                        const result = await savePlayerPhoto(form)
                        if (result.error) setError(t(result.error))
                        else { setSavedUrl(result.url); router.refresh() }
                    } catch { setError(t('No se pudo guardar la foto.')) }
                })
            }} />
        </span>
        {error && <p role="alert" className="max-w-48 text-xs text-red-700">{error}</p>}
    </label>
}
