'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { sendGuardianAccess } from '@/app/actions/guardians'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

export function GuardianAccessButton({ id, hasAccount, email }: { id: string; hasAccount: boolean; email?: string | null }) {
    const [busy, setBusy] = useState(false)
    const router = useRouter()
    return <Button variant="outline" disabled={busy || !email} onClick={async () => {
        if (!confirm(`¿Enviar un enlace seguro a ${email}? El tutor conservará su ficha y todos sus jugadores. Si ya tiene cuenta, recibirá un enlace para establecer o recuperar su contraseña.`)) return
        setBusy(true)
        try {
            const result = await sendGuardianAccess(id)
            if (result.success) { toast.success('Enlace de acceso enviado'); router.refresh() }
            else toast.error(result.error)
        } catch { toast.error('No se pudo confirmar el envío. Revisa la ficha antes de repetir.') }
        finally { setBusy(false) }
    }}>{busy ? 'Enviando…' : hasAccount ? 'Reenviar acceso' : 'Enviar activación'}</Button>
}
