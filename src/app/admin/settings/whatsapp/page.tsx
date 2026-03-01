import { getWhatsAppSettings, getWhatsAppStatus, getWhatsAppQR } from '@/app/actions/whatsapp'
import { WhatsAppSettingsClient } from './settings-client'

export const dynamic = 'force-dynamic'

export default async function WhatsAppSettingsPage() {
    const settings = await getWhatsAppSettings()
    const idInstance = settings?.greenapi_id_instance || ''
    const apiTokenInstance = settings?.greenapi_api_token_instance || ''

    let status = 'NOT_CONFIGURED'
    let qrMessage = null

    if (idInstance && apiTokenInstance) {
        const statusRes = await getWhatsAppStatus(idInstance, apiTokenInstance)
        status = statusRes.status

        if (status === 'notAuthorized' || status === 'ERROR') {
            qrMessage = await getWhatsAppQR(idInstance, apiTokenInstance)
        }
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <h1 className="text-3xl font-bold tracking-tight">Integración WhatsApp (Green API)</h1>
            <p className="text-muted-foreground">Configura las credenciales de Green API para habilitar el envío masivo de mensajes a las familias.</p>

            <WhatsAppSettingsClient
                initialIdInstance={idInstance}
                initialApiToken={apiTokenInstance}
                initialStatus={status}
                qrMessage={qrMessage}
            />
        </div>
    )
}
