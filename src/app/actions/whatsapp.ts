'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/auth'

// ─── SETTINGS ───

async function getWhatsAppSettings() {
    const { supabase } = await requireAdmin()
    const { data, error } = await supabase
        .from('academy_settings')
        .select('greenapi_id_instance, greenapi_api_token_instance')
        .eq('key', 'whatsapp_integration')
        .maybeSingle()
    if (error && error.code !== 'PGRST116') { console.error('Error fetching whatsapp settings:', error); return null }
    return data
}

export async function saveWhatsAppSettings(idInstance: string, apiToken: string) {
    const { supabase } = await requireAdmin()
    const cleanId = idInstance.trim()
    const cleanToken = apiToken.trim()

    const { data: current } = await supabase
        .from('academy_settings')
        .select('greenapi_id_instance, greenapi_api_token_instance')
        .eq('key', 'whatsapp_integration')
        .maybeSingle()

    const finalId = cleanId || current?.greenapi_id_instance || ''
    const finalToken = cleanToken || current?.greenapi_api_token_instance || ''
    if (!/^\d{5,20}$/.test(finalId)) {
        return { success: false, error: 'El ID de instancia no tiene un formato válido.' }
    }
    if (finalToken.length < 20) {
        return { success: false, error: 'El token de API no tiene un formato válido.' }
    }

    const { error } = await supabase
        .from('academy_settings')
        .upsert({
            key: 'whatsapp_integration',
            is_public: false,
            greenapi_id_instance: finalId,
            greenapi_api_token_instance: finalToken
        }, { onConflict: 'key' })
    if (error) return { success: false, error: error.message }

    revalidatePath('/admin/settings/whatsapp')
    return { success: true }
}

export async function getWhatsAppStatus() {
    const settings = await getWhatsAppSettings()
    const idInstance = settings?.greenapi_id_instance || ''
    const apiToken = settings?.greenapi_api_token_instance || ''
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

export async function getWhatsAppQR() {
    const settings = await getWhatsAppSettings()
    const idInstance = settings?.greenapi_id_instance || ''
    const apiToken = settings?.greenapi_api_token_instance || ''
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
    guardianIds: string[]
    userIds: string[]
    teamName?: string
    categoryName?: string
}

export async function getCategoriesWithTeams() {
    const { supabase } = await requireAdmin()
    const { data: categories } = await supabase
        .from('categories')
        .select('id, name')
        .eq('is_active', true)
        .order('sort_order')
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
    const { supabase } = await requireAdmin()
    const { data: children } = await supabase
        .from('children')
        .select(`
            id, full_name, category_id,
            category:categories(name),
            team:teams(name),
            child_guardians(guardian:guardians(id, user_id, full_name, phone))
        `)
        .eq('category_id', categoryId)

    return extractRecipients(children || [])
}

export async function getRecipientsByTeam(teamId: string): Promise<Recipient[]> {
    const { supabase } = await requireAdmin()

    // Children have a direct team_id column
    const { data: children } = await supabase
        .from('children')
        .select(`
            id, full_name,
            category:categories(name),
            team:teams(name),
            child_guardians(guardian:guardians(id, user_id, full_name, phone))
        `)
        .eq('team_id', teamId)

    return extractRecipients(children || [])
}

export async function getRecipientsAllGuardians(): Promise<Recipient[]> {
    const { supabase } = await requireAdmin()
    const { data: guardians, error } = await supabase
        .from('guardians')
        .select(`
            id, user_id, full_name, phone,
            children:child_guardians(
                child:children(full_name, archived_at, category:categories(name), team:teams(name))
            )
        `)
        .order('full_name')

    if (error) {
        console.error('Error fetching all guardian recipients:', error)
        return []
    }

    const recipients: Recipient[] = []
    for (const guardian of guardians || []) {
        const phone = guardian.phone?.replace(/\D/g, '') || ''
        if (phone.length < 9 && !guardian.user_id) continue

        const activeChildren = ((guardian.children || []) as any[])
            .map((relation) => relation.child)
            .filter((child) => child && !child.archived_at)
        const childNames = activeChildren.map((child) => child.full_name)
        const teamNames = [...new Set(activeChildren.map((child) => child.team?.name).filter(Boolean))]
        const categoryNames = [...new Set(activeChildren.map((child) => child.category?.name).filter(Boolean))]

        recipients.push({
            id: guardian.id,
            childName: childNames.join(' · ') || 'Tutor sin jugador activo',
            guardianName: guardian.full_name,
            phone,
            guardianIds: [guardian.id],
            userIds: guardian.user_id ? [guardian.user_id] : [],
            teamName: teamNames.join(' · '),
            categoryName: categoryNames.join(' · '),
        })
    }

    return dedupeRecipientsByPhone(recipients)
}

function extractRecipients(children: any[]): Recipient[] {
    const recipients: Recipient[] = []

    for (const child of children) {
        const teamName = (child.team as any)?.name || ''
        const categoryName = (child.category as any)?.name || ''

        if (!child.child_guardians) continue
        for (const cg of child.child_guardians) {
            const g = cg.guardian as any
            if (!g?.id) continue
            const cleanPhone = g.phone?.replace(/\D/g, '') || ''
            if (cleanPhone.length < 9 && !g.user_id) continue

            recipients.push({
                id: g.id,
                childName: child.full_name,
                guardianName: g.full_name,
                phone: cleanPhone,
                guardianIds: [g.id],
                userIds: g.user_id ? [g.user_id] : [],
                teamName,
                categoryName
            })
        }
    }
    return dedupeRecipientsByPhone(recipients)
}

function dedupeRecipientsByPhone(recipients: Recipient[]): Recipient[] {
    const byPhone = new Map<string, Recipient>()

    for (const recipient of recipients) {
        const recipientKey = recipient.phone || recipient.userIds[0] || recipient.id
        const existing = byPhone.get(recipientKey)
        if (!existing) {
            byPhone.set(recipientKey, recipient)
            continue
        }

        const appendUnique = (current: string | undefined, next: string | undefined) => {
            const values = new Set([...(current || '').split(' · ').filter(Boolean), ...(next || '').split(' · ').filter(Boolean)])
            return Array.from(values).join(' · ')
        }

        existing.childName = appendUnique(existing.childName, recipient.childName)
        existing.guardianName = appendUnique(existing.guardianName, recipient.guardianName)
        existing.teamName = appendUnique(existing.teamName, recipient.teamName)
        existing.categoryName = appendUnique(existing.categoryName, recipient.categoryName)
        existing.guardianIds = Array.from(new Set([...existing.guardianIds, ...recipient.guardianIds]))
        existing.userIds = Array.from(new Set([...existing.userIds, ...recipient.userIds]))
    }

    return Array.from(byPhone.values())
}

// ─── SENDING (with rate limiting) ───

const DELAY_BETWEEN_MESSAGES_MS = 750
const MAX_RECIPIENTS_PER_BATCH = 25

export async function sendToRecipients(phones: string[], message: string, label: string) {
    await requireAdmin()

    if (phones.length > MAX_RECIPIENTS_PER_BATCH) {
        return { success: false, error: `Máximo ${MAX_RECIPIENTS_PER_BATCH} destinatarios por envío.` }
    }

    if (message.trim().length < 2 || message.length > 2000) {
        return { success: false, error: 'El mensaje debe tener entre 2 y 2000 caracteres.' }
    }

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

        // Rate limiting: leave a short gap between messages (except for last one).
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
        channel: 'whatsapp',
    }])

    revalidatePath('/admin/comunicados')
    return { success: true, summary: { success: successCount, failed: failCount, total: phones.length } }
}

export async function publishPortalAnnouncement(userIds: string[], message: string, label: string, targetScope: 'all' | 'category' | 'team') {
    const { supabase } = await requireAdmin()
    const cleanMessage = message.trim()
    const recipients = Array.from(new Set(userIds.filter(Boolean)))

    if (cleanMessage.length < 2 || cleanMessage.length > 2000) {
        return { success: false, error: 'El comunicado debe tener entre 2 y 2000 caracteres.' }
    }
    if (recipients.length === 0) {
        return { success: false, error: 'No hay tutores con acceso al Portal Familias en la selección.' }
    }

    const { error: logError } = await supabase.from('broadcast_logs').insert({
        category_name: label,
        message: cleanMessage,
        sent_count: recipients.length,
        failed_count: 0,
        channel: 'portal',
        target_scope: targetScope,
    })
    if (logError) return { success: false, error: logError.message }

    const { error: notificationError } = await supabase.from('notifications').insert(
        recipients.map((userId) => ({
            user_id: userId,
            title: 'Nuevo comunicado Academy',
            message: cleanMessage.length > 180 ? `${cleanMessage.slice(0, 177)}…` : cleanMessage,
            type: 'info',
            link_url: '/portal/comunicados',
        }))
    )
    if (notificationError) {
        console.error('Portal announcement notification error:', notificationError)
        return { success: false, error: 'El comunicado se publicó, pero no se pudieron crear sus notificaciones.' }
    }

    revalidatePath('/admin/comunicados')
    revalidatePath('/portal/comunicados')
    revalidatePath('/portal', 'layout')
    return { success: true, summary: { published: recipients.length } }
}

// Legacy function kept for backwards compat
export async function sendBroadcastMessage(categoryId: string, message: string) {
    await requireAdmin()
    const recipients = await getRecipientsByCategory(categoryId)
    const phones = recipients.map(r => r.phone)
    const supabase = await createClient()
    const { data: category } = await supabase.from('categories').select('name').eq('id', categoryId).single()
    return sendToRecipients(phones, message, category?.name || 'Categoría')
}

// ─── HISTORY ───

export async function getBroadcastHistory() {
    const { supabase } = await requireAdmin()
    const { data, error } = await supabase
        .from('broadcast_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20)
    if (error) { console.error("Error fetching broadcast history:", error); return [] }
    return data || []
}
