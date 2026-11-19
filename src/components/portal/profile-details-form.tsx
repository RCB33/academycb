'use client'
import { useState, type ReactNode } from 'react'
import { updateProfile } from '@/app/actions/profiles'
import { useT } from '@/lib/i18n/client'

export function ProfileDetailsForm({ children }: { children: ReactNode }) {
    const t = useT()
    const [pending, setPending] = useState(false)
    const [message, setMessage] = useState('')
    const [failed, setFailed] = useState(false)
    return <form onSubmit={async event => {
        event.preventDefault()
        if (pending) return
        const data = new FormData(event.currentTarget)
        setPending(true); setMessage(''); setFailed(false)
        try { await updateProfile(data); setMessage('Tus datos se han guardado.') }
        catch { setFailed(true); setMessage('No se pudieron guardar tus datos. Inténtalo de nuevo.') }
        finally { setPending(false) }
    }} className="space-y-4">
        <fieldset disabled={pending} className="space-y-4">{children}</fieldset>
        {pending && <p role="status" className="text-sm text-slate-600">{t('Guardando…')}</p>}
        {message && <p role={failed ? 'alert' : 'status'} className={`rounded-lg p-3 text-sm ${failed ? 'bg-red-50 text-red-800' : 'bg-emerald-50 text-emerald-800'}`}>{t(message)}</p>}
    </form>
}
