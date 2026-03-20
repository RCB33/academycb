'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// ─── SETTINGS ───

export async function getWhatsAppSettings() {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('academy_settings')
        .select('greenapi_id_instance, greenapi_api_token_instance')
        .single()
    if (error && error.code !== 'PGRST116') { console.error('Error fetching whatsapp settings:', error); return null }
    return data
}

export async function saveWhatsAppSettings(idInstance: string, apiToken: string) {
    const supabase = await createClient()
    const { error: updateError } = await supabase
        .from('academy_settings')
        .update({ greenapi_id_instance: idInstance, greenapi_api_token_instance: apiToken })
        .eq('id', (await supabase.from('academy_settings').select('id').single()).data?.id)
    if (updateError) {
        const { error: insertError } = await supabase
            .from('academy_settings')
            .insert([{ greenapi_id_instance: idInstance, greenapi_api_token_instance: apiToken }])
        if (insertError) return { success: false, error: insertError.message }
    }
    revalidatePath('/admin/settings/whatsapp')
    return { success: true }
}

export async function getWhatsAppStatus(idInstance: string, apiToken: string) {
    if (!idInstance || !apiToken) return { status: 'NOT_CONFIGURED' }
    try {
        const response = await fetch(`https://api.green-api.com/waInstance${idInstance}/getStateInstance/${apiToken}`)
        if (!response.ok) return { status: 'ERROR', message: `API responded with ${response.status}` }
        const data = await response.json()
        return { status: data.stateInstance }
    } catch (e: any) {
        console.error('Error fetching WhatsApp status:', e)
        return { status: 'ERROR', message: e.message }
    }
}

export async function getWhatsAppQR(idInstance: string, apiToken: string) {
    if (!idInstance || !apiToken) return null
    try {
        const response = await fetch(`https://api.green-api.com/waInstance${idInstance}/qr/${apiToken}`)
        if (!response.ok) { console.error('Failed to get QR'); return null }
        const data = await response.json()
        return data.message
    } catch (e) { console.error('Error fetching QR:', e); return null }
}

// ─── RECIPIENTS ───

export type Recipient = {
    id: string
    childName: string
    guardianName: string
    phone: string
    teamName?: string
    categoryName?: string
}

export async function getCategoriesWithTeams() {
    const supabase = await createClient()
    const { data: categories } = await supabase
        .from('categories')
        .select('id, name')
        .order('name')

    const { data: teams } = await supabase
        .from('teams')
        .select('id, name, category_id, category:categories(name)')
        .eq('status', 'active')
        .order('name')

    return {
        categories: categories || [],
        teams: (teams || []).map((t: any) => ({
            id: t.id,
            name: t.name,
            category_id: t.category_id,
            category_name: t.category?.name || ''
        }))
    }
}

export async function getRecipientsByCategory(categoryId: string): Promise<Recipient[]> {
    const supabase = await createClient()
    const { data: children } = await supabase
        .from('children')
        .select(`
            id, full_name, category_id,
            category:categories(name),
            team:teams(name),
            child_guardians(guardian:guardians(id, full_name, phone))
        `)
        .eq('category_id', categoryId)

    return extractRecipients(children || [])
}

export async function getRecipientsByTeam(teamId: string): Promise<Recipient[]> {
    const supabase = await createClient()

    // Children have a direct team_id column
    const { data: children } = await supabase
        .from('children')
        .select(`
            id, full_name,
            category:categories(name),
            team:teams(name),
            child_guardians(guardian:guardians(id, full_name, phone))
        `)
        .eq('team_id', teamId)

    return extractRecipients(children || [])
}

function extractRecipients(children: any[]): Recipient[] {
    const recipients: Recipient[] = []
    const seen = new Set<string>()

    for (const child of children) {
        const teamName = (child.team as any)?.name || ''
        const categoryName = (child.category as any)?.name || ''

        if (!child.child_guardians) continue
        for (const cg of child.child_guardians) {
            const g = cg.guardian as any
            if (!g?.phone) continue
            const cleanPhone = g.phone.replace(/\D/g, '')
            if (cleanPhone.length < 9) continue
            const key = `${g.id}-${child.id}`
            if (seen.has(key)) continue
            seen.add(key)

            recipients.push({
                id: key,
                childName: child.full_name,
                guardianName: g.full_name,
                phone: cleanPhone,
                teamName,
                categoryName
            })
        }
    }
    return recipients
}

// ─── SENDING (with rate limiting) ───

const DELAY_BETWEEN_MESSAGES_MS = 60_000 // 1 minute between messages to avoid WhatsApp blocks

export async function sendToRecipients(phones: string[], message: string, label: string) {
    const settings = await getWhatsAppSettings()
    if (!settings?.greenapi_id_instance || !settings?.greenapi_api_token_instance) {
        return { success: false, error: 'WhatsApp no está configurado. Ve a Configuración API.' }
    }

    if (phones.length === 0) {
        return { success: false, error: 'No hay destinatarios seleccionados.' }
    }

    let successCount = 0
    let failCount = 0

    for (let i = 0; i < phones.length; i++) {
        let chatId = phones[i]
        // Add Spain country code if needed
        if (chatId.length === 9 && (chatId.startsWith('6') || chatId.startsWith('7'))) {
            chatId = '34' + chatId
        }
        chatId = `${chatId}@c.us`

        try {
            const url = `https://api.green-api.com/waInstance${settings.greenapi_id_instance}/sendMessage/${settings.greenapi_api_token_instance}`
            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ chatId, message })
            })
            if (res.ok) successCount++
            else failCount++
        } catch (e) {
            console.error(`Error sending to ${phones[i]}:`, e)
            failCount++
        }

        // Rate limiting: wait 1 minute between messages (except for last one)
        if (i < phones.length - 1) {
            await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_MESSAGES_MS))
        }
    }

    // Log the broadcast
    const supabase = await createClient()
    await supabase.from('broadcast_logs').insert([{
        category_name: label,
        message,
        sent_count: successCount,
        failed_count: failCount,
    }])

    revalidatePath('/admin/comunicados')
    return { success: true, summary: { success: successCount, failed: failCount, total: phones.length } }
}

// Legacy function kept for backwards compat
export async function sendBroadcastMessage(categoryId: string, message: string) {
    const recipients = await getRecipientsByCategory(categoryId)
    const phones = recipients.map(r => r.phone)
    const supabase = await createClient()
    const { data: category } = await supabase.from('categories').select('name').eq('id', categoryId).single()
    return sendToRecipients(phones, message, category?.name || 'Categoría')
}

// ─── HISTORY ───

export async function getBroadcastHistory() {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('broadcast_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20)
    if (error) { console.error("Error fetching broadcast history:", error); return [] }
    return data || []
}
