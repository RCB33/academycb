export type Channel = 'portal' | 'email' | 'whatsapp'
export type DeliveryResult = { channel: Channel; status: 'sent' | 'partial' | 'failed' | 'skipped'; sent: number; failed: number; detail?: string }
export type ChannelResponse = { success: boolean; error?: string; summary?: { success?: number; published?: number; failed?: number } }

export async function deliverChannels(channels: Channel[], send: (channel: Channel) => Promise<ChannelResponse | null>): Promise<DeliveryResult[]> {
    const results: DeliveryResult[] = []
    for (const channel of [...new Set(channels)]) {
        try {
            const result = await send(channel)
            if (!result) { results.push({ channel, status: 'skipped', sent: 0, failed: 0, detail: 'Sin destinatarios disponibles en este canal.' }); continue }
            const sent = result.summary?.success ?? result.summary?.published ?? 0
            const failed = result.summary?.failed ?? 0
            results.push({ channel, status: !result.success || failed > 0 ? sent > 0 ? 'partial' : 'failed' : 'sent', sent, failed, detail: result.error })
        } catch {
            results.push({ channel, status: 'failed', sent: 0, failed: 0, detail: 'No se pudo confirmar el resultado. Revisa el historial antes de repetir el envío.' })
        }
    }
    return results
}

export function normalizedPhone(phone: string) {
    const clean = phone.replace(/\D/g, '')
    return clean.length === 9 && /^[67]/.test(clean) ? `34${clean}` : clean
}
