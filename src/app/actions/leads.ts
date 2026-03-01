'use server'

import { createClient } from '@/lib/supabase/server'
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
