'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function getWhatsAppSettings() {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('academy_settings')
        .select('greenapi_id_instance, greenapi_api_token_instance')
        .single()

    if (error && error.code !== 'PGRST116') {
        console.error('Error fetching whatsapp settings:', error)
        return null
    }

    return data
}

export async function saveWhatsAppSettings(idInstance: string, apiToken: string) {
    const supabase = await createClient()

    // Try to update the first row
    const { error: updateError } = await supabase
        .from('academy_settings')
        .update({
            greenapi_id_instance: idInstance,
            greenapi_api_token_instance: apiToken
        })
        .eq('id', (await supabase.from('academy_settings').select('id').single()).data?.id) // Update the single row

    if (updateError) {
        // If no row exists, we should insert one (though migration creates an empty one)
        const { error: insertError } = await supabase
            .from('academy_settings')
            .insert([{
                greenapi_id_instance: idInstance,
                greenapi_api_token_instance: apiToken
            }])
        if (insertError) {
            console.error('Error inserting whatsapp settings:', insertError)
            return { success: false, error: insertError.message }
        }
    }

    revalidatePath('/admin/settings/whatsapp')
    return { success: true }
}

export async function getWhatsAppStatus(idInstance: string, apiToken: string) {
    if (!idInstance || !apiToken) return { status: 'NOT_CONFIGURED' }

    try {
        const response = await fetch(`https://api.green-api.com/waInstance${idInstance}/getStateInstance/${apiToken}`)
        if (!response.ok) {
            return { status: 'ERROR', message: `API responded with ${response.status}` }
        }
        const data = await response.json()
        return { status: data.stateInstance } // e.g. "authorized", "notAuthorized"
    } catch (e: any) {
        console.error('Error fetching WhatsApp status:', e)
        return { status: 'ERROR', message: e.message }
    }
}

export async function getWhatsAppQR(idInstance: string, apiToken: string) {
    if (!idInstance || !apiToken) return null

    try {
        const response = await fetch(`https://api.green-api.com/waInstance${idInstance}/qr/${apiToken}`)
        if (!response.ok) {
            console.error('Failed to get QR')
            return null
        }
        const data = await response.json()
        return data.message // Should be base64 image data string
    } catch (e) {
        console.error('Error fetching QR:', e)
        return null
    }
}

export async function sendBroadcastMessage(categoryId: string, message: string) {
    // 1. Get credentials
    const settings = await getWhatsAppSettings()
    if (!settings?.greenapi_id_instance || !settings?.greenapi_api_token_instance) {
        return { success: false, error: 'WhatsApp is not configured.' }
    }

    const supabase = await createClient()

    // 2. Fetch guardians for this category
    const { data: children, error } = await supabase
        .from('children')
        .select('id, full_name, child_guardians(guardian:guardians(phone, full_name))')
        .eq('category_id', categoryId)

    if (error || !children) {
        return { success: false, error: 'Could not fetch recipients.' }
    }

    // 3. Extract unique phone numbers
    const phones = new Set<string>()
    children.forEach(child => {
        child.child_guardians.forEach((cg: any) => {
            const phone = cg.guardian?.phone
            if (phone) {
                // Clean non-numeric chars
                const cleanPhone = phone.replace(/\D/g, '')
                // Basic validation: length (usually 9 to 15 digits)
                if (cleanPhone.length >= 9) {
                    phones.add(cleanPhone)
                }
            }
        })
    })

    const recipients = Array.from(phones)
    console.log(`Sending to ${recipients.length} recipients...`)

    if (recipients.length === 0) {
        return { success: false, error: 'No valid phone numbers found for this category.' }
    }

    let successCount = 0
    let failCount = 0

    // 4. Send messages
    for (const phone of recipients) {
        // Green API requires country code, e.g., '34600123456@c.us'
        // We'll assume the phone already includes country code, if not, append '34' (Spain) as default for demo.
        let chatId = phone
        if (chatId.length === 9 && chatId.startsWith('6')) {
            chatId = '34' + chatId
        }
        chatId = `${chatId}@c.us`

        try {
            const url = `https://api.green-api.com/waInstance${settings.greenapi_id_instance}/sendMessage/${settings.greenapi_api_token_instance}`
            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chatId: chatId,
                    message: message
                })
            })

            if (res.ok) {
                successCount++
            } else {
                failCount++
            }
        } catch (e) {
            console.error(`Error sending to ${phone}:`, e)
            failCount++
        }

        // Optional: delay to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 100))
    }

    return { success: true, summary: { success: successCount, failed: failCount } }
}
