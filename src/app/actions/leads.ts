'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { requireAdmin } from '@/lib/auth'

const leadSchema = z.object({
    guardian_name: z.string().min(2, "Nombre requerido"),
    phone: z.string().regex(/^\+?[0-9\s()-]{9,20}$/, "Teléfono inválido"),
    child_name: z.string().min(2, "Nombre del niño requerido"),
    birth_year: z.number().int().min(1900, "Año de nacimiento inválido").max(new Date().getFullYear(), "Año de nacimiento inválido"),
    category_text: z.string().min(1, "Categoría requerida").max(120),
    consent: z.literal('on'),
    website: z.string().max(0),
})

export type LeadState = {
    success?: boolean
    error?: string
    message?: string
}

const contactSchema = z.object({
    name: z.string().trim().min(2).max(120),
    email: z.string().trim().email().max(200),
    phone: z.string().trim().max(30).optional(),
    message: z.string().trim().min(10).max(3000),
    consent: z.literal('on'),
    website: z.string().max(0),
})

export async function submitContact(_previousState: LeadState, formData: FormData): Promise<LeadState> {
    const validated = contactSchema.safeParse({
        name: formData.get('name'),
        email: formData.get('email'),
        phone: formData.get('phone') || undefined,
        message: formData.get('message'),
        consent: formData.get('consent'),
        website: formData.get('website') || '',
    })

    if (!validated.success) {
        return { success: false, error: validated.error.issues[0]?.message || 'Revisa los campos.' }
    }

    const supabase = await createClient()
    const { name, email, phone, message } = validated.data
    const { error } = await supabase.from('contact_messages').insert({ name, email, phone: phone || null, message, status: 'new' })

    if (error) {
        console.error('Contact message error:', error)
        return { success: false, error: 'No se pudo enviar el mensaje. Inténtalo de nuevo.' }
    }

    return { success: true, message: 'Mensaje enviado. Te responderemos lo antes posible.' }
}

export async function submitLead(_previousState: LeadState, formData: FormData) {
    const supabase = await createClient()

    const rawData = {
        guardian_name: formData.get('guardian_name'),
        phone: formData.get('phone'),
        child_name: formData.get('child_name'),
        birth_year: parseInt(formData.get('birth_year') as string),
        category_text: formData.get('category_text'),
        consent: formData.get('consent'),
        website: formData.get('website') || '',
    }

    const validatedFields = leadSchema.safeParse(rawData)

    if (!validatedFields.success) {
        console.error("Lead validation error:", validatedFields.error)
        return {
            success: false,
            error: validatedFields.error.issues[0]?.message || "Datos inválidos. Revisa los campos.",
        }
    }

    const { error } = await supabase
        .from('leads')
        .insert([{
            guardian_name: validatedFields.data.guardian_name,
            phone: validatedFields.data.phone,
            child_name: validatedFields.data.child_name,
            birth_year: validatedFields.data.birth_year,
            category_text: validatedFields.data.category_text,
            source: 'web_agent',
            status: 'new'
        }])

    if (error) {
        console.error('Lead error:', error)
        return {
            success: false,
            error: "Error al guardar la solicitud. Inténtalo de nuevo.",
        }
    }

    return {
        success: true,
        message: "¡Gracias! Te contactaremos pronto.",
    }
}

export async function convertLead(id: string) {
    const { supabase } = await requireAdmin()

    // 1. Get lead
    const { data: lead } = await supabase.from('leads').select('*').eq('id', id).single()
    if (!lead) return { success: false, error: "Lead no encontrado" }

    // 2. Create student
    const { data: child, error: childError } = await supabase.from('children').insert({
        full_name: lead.child_name,
        birth_year: lead.birth_year,
        birth_date: null
    }).select().single()

    if (childError) return { success: false, error: childError.message }

    // 3. Create guardian
    const { data: guardian, error: guardianError } = await supabase.from('guardians').insert({
        full_name: lead.guardian_name,
        email: lead.email || null,
        phone: lead.phone || ''
    }).select().single()

    if (guardianError) {
        await supabase.from('children').delete().eq('id', child.id)
        return { success: false, error: guardianError.message }
    }

    // 4. Link child and guardian
    const { error: linkError } = await supabase.from('child_guardians').insert({
        child_id: child.id,
        guardian_id: guardian.id,
        relationship: 'Tutor',
        is_primary: true
    })
    if (linkError) {
        await supabase.from('guardians').delete().eq('id', guardian.id)
        await supabase.from('children').delete().eq('id', child.id)
        return { success: false, error: linkError.message }
    }

    // 5. Update lead status
    const { error: leadError } = await supabase.from('leads').update({ status: 'enrolled' }).eq('id', id)
    if (leadError) return { success: false, error: leadError.message }

    revalidatePath('/admin/leads')
    revalidatePath('/admin/crm/alumnos')
    revalidatePath('/admin/crm/tutores')

    return { success: true }
}
