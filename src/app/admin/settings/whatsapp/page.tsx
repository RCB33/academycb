import { getWhatsAppStatus, getWhatsAppQR } from '@/app/actions/whatsapp'
import { WhatsAppSettingsClient } from './settings-client'

export const dynamic = 'force-dynamic'

export default async function WhatsAppSettingsPage() {
    const statusRes = await getWhatsAppStatus()
    const status = statusRes.status
    let qrMessage = null

    if (status === 'notAuthorized' || status === 'ERROR') {
        qrMessage = await getWhatsAppQR()
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <h1 className="text-3xl font-bold tracking-tight">Integración WhatsApp (Green API)</h1>
            <p className="text-muted-foreground">Configura las credenciales de Green API para habilitar el envío masivo de mensajes a las familias.</p>

            <WhatsAppSettingsClient
                initialStatus={status}
                qrMessage={qrMessage}
            />
        </div>
    )
}
