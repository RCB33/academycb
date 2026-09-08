import 'server-only'

import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

const serviceSchema = z.enum(['academy', 'campus', 'tournament'])

export const enrollmentSchema = z.object({
    service: serviceSchema,
    activity_id: z.string().uuid().optional().or(z.literal('')),
    child_name: z.string().trim().min(2, 'Indica el nombre completo del jugador.').max(120),
    birth_date: z.string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, 'Indica una fecha de nacimiento válida.')
        .refine((value) => {
            // A birth date is a calendar date. Parsing it as local midnight changes
            // the UTC day in time zones such as Europe/Madrid and rejects valid dates.
            const date = new Date(`${value}T00:00:00.000Z`)
            return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value && date <= new Date()
        }, 'Indica una fecha de nacimiento válida.'),
    guardian_name: z.string().trim().min(2, 'Indica el nombre completo del tutor/a.').max(120),
    email: z.string().trim().email('Indica un email válido.').max(200),
    phone: z.string().trim().regex(/^\+?[0-9\s()-]{9,20}$/, 'Indica un teléfono válido.'),
    notes: z.string().trim().max(1000, 'Las observaciones no pueden superar 1.000 caracteres.').optional(),
    privacy_consent: z.literal('on', { error: 'Debes aceptar la política de privacidad para enviar la solicitud.' }),
    terms_consent: z.literal('on', { error: 'Debes aceptar las condiciones generales para enviar la solicitud.' }),
    website: z.string().max(0),
})

export type EnrollmentPayload = z.input<typeof enrollmentSchema>
const familyEnrollmentSchema = enrollmentSchema.omit({ service: true, activity_id: true, child_name: true, birth_date: true }).extend({
    children: z.array(enrollmentSchema.pick({ service: true, activity_id: true, child_name: true, birth_date: true })).min(1).max(6, 'Puedes enviar hasta 6 jugadores a la vez.'),
})
export type EnrollmentResult = { success: true; message: string } | { success: false; error: string }

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
        if (!data || data.end_date < today) return null
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

export async function createEnrollmentRequest(payload: unknown): Promise<EnrollmentResult> {
    const input = payload && typeof payload === 'object' && 'children' in payload
        ? payload
        : payload && typeof payload === 'object' ? { ...payload, children: [payload] } : payload
    const parsed = familyEnrollmentSchema.safeParse(input)
    if (!parsed.success) {
        return { success: false, error: parsed.error.issues[0]?.message || 'Revisa los datos de la solicitud.' }
    }

    const rows = []
    const seen = new Set<string>()
    for (const child of parsed.data.children) {
        const identity = `${child.child_name.toLocaleLowerCase()}|${child.birth_date}`
        if (seen.has(identity)) return { success: false, error: `Has añadido dos veces a ${child.child_name}. Revisa los jugadores.` }
        seen.add(identity)
        const activity = await resolveActivity(child.service, child.activity_id || undefined)
        if (!activity) return { success: false, error: `La actividad de ${child.child_name} ya no está disponible. Elige otra opción.` }
        rows.push({
            service: child.service,
            activity_id: activity.id || null,
            activity_name: activity.name,
            child_name: child.child_name,
            birth_date: child.birth_date,
            guardian_name: parsed.data.guardian_name,
            email: parsed.data.email.toLowerCase(),
            phone: parsed.data.phone,
            notes: parsed.data.notes || null,
            status: 'new',
        })
    }

    const supabase = await createClient()
    // One insert is atomic: either every child's request is saved or none is.
    const { error } = await supabase.from('enrollment_requests').insert(rows)

    if (error) {
        console.error('Enrollment request error:', error)
        return { success: false, error: 'No se pudo enviar la solicitud. Inténtalo de nuevo o contacta con la academia.' }
    }

    return {
        success: true,
        message: rows.length > 1
            ? `Hemos recibido las solicitudes de tus ${rows.length} jugadores. Secretaría revisará cada plaza y contactará contigo para confirmar los siguientes pasos.`
            : 'Solicitud recibida. Secretaría revisará la plaza y contactará contigo para confirmar los siguientes pasos.',
    }
}
