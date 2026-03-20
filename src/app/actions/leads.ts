'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

const leadSchema = z.object({
    guardian_name: z.string().min(2, "Nombre requerido"),
    phone: z.string().min(6, "Teléfono inválido"),
    child_name: z.string().min(2, "Nombre del niño requerido"),
    birth_year: z.number().int().min(1900, "Año de nacimiento inválido").max(new Date().getFullYear(), "Año de nacimiento inválido"),
    category_text: z.string().min(1, "Categoría requerida"), // "Libre" text as per prompt
})

export type LeadState = {
    success?: boolean
    error?: string
    message?: string
}

export async function submitLead(prevState: LeadState, formData: FormData) {
    const supabase = await createClient()

    const rawData = {
        guardian_name: formData.get('guardian_name'),
        phone: formData.get('phone'),
        child_name: formData.get('child_name'),
        birth_year: parseInt(formData.get('birth_year') as string),
        category_text: formData.get('category_text'),
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
            ...validatedFields.data,
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
    const supabase = await createClient()

    // 1. Get lead
    const { data: lead } = await supabase.from('leads').select('*').eq('id', id).single()
    if (!lead) return { success: false, error: "Lead no encontrado" }

    // 2. Create student
    const { data: child, error: childError } = await supabase.from('children').insert({
        full_name: lead.child_name,
        birth_year: lead.birth_year,
        birth_date: `${lead.birth_year}-01-01` // Fallback date
    }).select().single()

    if (childError) return { success: false, error: childError.message }

    // 3. Create guardian
    const { data: guardian, error: guardianError } = await supabase.from('guardians').insert({
        full_name: lead.guardian_name,
        email: lead.email || null,
        phone: lead.phone || ''
    }).select().single()

    if (guardianError) return { success: false, error: guardianError.message }

    // 4. Link child and guardian
    await supabase.from('child_guardians').insert({
        child_id: child.id,
        guardian_id: guardian.id,
        relationship: 'Tutor',
        is_primary: true
    })

    // 5. Update lead status
    await supabase.from('leads').update({ status: 'enrolled' }).eq('id', id)

    revalidatePath('/admin/leads')
    revalidatePath('/admin/crm/alumnos')
    revalidatePath('/admin/crm/tutores')

    return { success: true }
}
