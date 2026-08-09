'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { requireAdmin, requireMarketingAccess } from '@/lib/auth'

const serviceSchema = z.enum(['academy', 'campus', 'tournament'])

const enrollmentSchema = z.object({
    service: serviceSchema,
    activity_id: z.string().uuid().optional().or(z.literal('')),
    child_name: z.string().trim().min(2, 'Indica el nombre completo del jugador.').max(120),
    birth_date: z.string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, 'Indica una fecha de nacimiento válida.')
        .refine((value) => {
            const date = new Date(`${value}T00:00:00`)
            return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value && date <= new Date()
        }, 'Indica una fecha de nacimiento válida.'),
    guardian_name: z.string().trim().min(2, 'Indica el nombre completo del tutor/a.').max(120),
    email: z.string().trim().email('Indica un email válido.').max(200),
    phone: z.string().trim().regex(/^\+?[0-9\s()-]{9,20}$/, 'Indica un teléfono válido.'),
    notes: z.string().trim().max(1000, 'Las observaciones no pueden superar 1.000 caracteres.').optional(),
    consent: z.literal('on'),
    website: z.string().max(0),
})

export type EnrollmentState = {
    success?: boolean
    error?: string
    message?: string
}

const initialState: EnrollmentState = {}
export { initialState as enrollmentInitialState }

type PublicActivity = { id: string; name: string }

async function resolveActivity(service: z.infer<typeof serviceSchema>, activityId: string | undefined): Promise<PublicActivity | null> {
    if (service === 'academy') return { id: '', name: 'Academia anual' }
    if (!activityId) return null

    const supabase = await createClient()
    const today = new Date().toISOString().slice(0, 10)
    if (service === 'campus') {
        const { data } = await supabase
            .from('campuses')
            .select('id, name, end_date')
            .eq('id', activityId)
            .eq('status', 'published')
            .maybeSingle()
        if (!data || data.end_date < new Date().toISOString().slice(0, 10)) return null
        return { id: data.id, name: data.name }
    }

    const { data } = await supabase
        .from('tournaments_internal')
        .select('id, title, end_date')
        .eq('id', activityId)
        .eq('status', 'open')
        .maybeSingle()
    if (!data || (data.end_date && data.end_date < today)) return null
    return { id: data.id, name: data.title }
}

export async function submitEnrollment(_previousState: EnrollmentState, formData: FormData): Promise<EnrollmentState> {
    const parsed = enrollmentSchema.safeParse({
        service: formData.get('service'),
        activity_id: formData.get('activity_id') || '',
        child_name: formData.get('child_name'),
        birth_date: formData.get('birth_date'),
        guardian_name: formData.get('guardian_name'),
        email: formData.get('email'),
        phone: formData.get('phone'),
        notes: formData.get('notes') || undefined,
        consent: formData.get('consent'),
        website: formData.get('website') || '',
    })

    if (!parsed.success) {
        return { success: false, error: parsed.error.issues[0]?.message || 'Revisa los datos de la solicitud.' }
    }

    const activity = await resolveActivity(parsed.data.service, parsed.data.activity_id || undefined)
    if (!activity) {
        return { success: false, error: 'La actividad seleccionada ya no está disponible. Elige otra opción.' }
    }

    const supabase = await createClient()
    const { error } = await supabase.from('enrollment_requests').insert({
        service: parsed.data.service,
        activity_id: activity.id || null,
        activity_name: activity.name,
        child_name: parsed.data.child_name,
        birth_date: parsed.data.birth_date,
        guardian_name: parsed.data.guardian_name,
        email: parsed.data.email,
        phone: parsed.data.phone,
        notes: parsed.data.notes || null,
        status: 'new',
    })

    if (error) {
        console.error('Enrollment request error:', error)
        return { success: false, error: 'No se pudo enviar la solicitud. Inténtalo de nuevo o contacta con la academia.' }
    }

    return {
        success: true,
        message: 'Solicitud recibida. Secretaría revisará la plaza y contactará contigo para confirmar los siguientes pasos.',
    }
}

const requestStatusSchema = z.enum(['new', 'contacted', 'interested', 'lost'])

export async function updateEnrollmentRequestStatus(id: string, status: string) {
    const { supabase } = await requireMarketingAccess()
    const parsedId = z.string().uuid().safeParse(id)
    const parsedStatus = requestStatusSchema.safeParse(status)
    if (!parsedId.success || !parsedStatus.success) return { success: false, error: 'Solicitud o estado no válido.' }

    const { error } = await supabase.rpc('update_enrollment_request_status', {
        request_uuid: parsedId.data,
        next_status: parsedStatus.data,
    })
    if (error) return { success: false, error: error.message }
    revalidatePath('/admin/leads')
    return { success: true }
}

export async function convertEnrollmentRequest(id: string) {
    const { supabase } = await requireAdmin()
    const parsedId = z.string().uuid().safeParse(id)
    if (!parsedId.success) return { success: false, error: 'Solicitud no válida.' }

    const { data: childId, error } = await supabase.rpc('convert_enrollment_request', {
        request_uuid: parsedId.data,
    })
    if (error) return { success: false, error: error.message }

    revalidatePath('/admin/leads')
    revalidatePath('/admin/crm/alumnos')
    revalidatePath('/admin/crm/tutores')
    return { success: true, childId }
}
