import 'server-only'

import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { academySelection } from '@/lib/offering-server'
import { createClient } from '@/lib/supabase/server'
import { deliverRegistrationEmails } from '@/lib/registration-email'

import { isAllowedEnrollmentPayment, paymentMessages, paymentChoicesText, paymentServiceLabels, type EnrollmentPayment, type PaymentService } from '@/lib/enrollment-payment'

const serviceSchema = z.enum(['academy', 'campus', 'tournament'])

export const enrollmentSchema = z.object({
    plan_id: z.string().optional(), group_id: z.string().optional(), second_group_id: z.string().optional(),
    start_date: z.string().optional(), plus: z.enum(['yes','no','']).optional(), offer_version: z.string().optional(), payment_choice: z.enum(['monthly_card','cash','transfer',''], { error: 'Elige una forma de pago válida: efectivo, tarjeta con Stripe o transferencia cuando corresponda.' }).optional(),
    campus_interest: z.enum(['yes', 'no', '']).optional(),
    tournament_interest: z.enum(['yes', 'no', '']).optional(),
    campus_payment_choice: z.string().max(30).optional(),
    tournament_payment_choice: z.string().max(30).optional(),
    service: serviceSchema,
    activity_id: z.string().uuid().optional().or(z.literal('')),
    child_name: z.string().trim().min(2, 'Indica el nombre completo del jugador.').max(120),
    linked_child_id: z.string().uuid().optional().or(z.literal('')),
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
    children: z.array(enrollmentSchema.pick({ service: true, activity_id: true, child_name: true, birth_date: true, linked_child_id: true, plan_id:true,group_id:true,second_group_id:true,start_date:true,plus:true,offer_version:true,payment_choice:true,campus_interest:true,tournament_interest:true,campus_payment_choice:true,tournament_payment_choice:true })).min(1).max(6, 'Puedes enviar hasta 6 jugadores a la vez.'),
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
            .select('id, name, end_date, public_program')
            .eq('id', activityId)
            .eq('status', 'published')
            .maybeSingle()
        if (!data || data.end_date < today || data.public_program) return null
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

    for (const child of parsed.data.children) {
        if (!isAllowedEnrollmentPayment(child.service, child.payment_choice)) return { success: false, error: paymentMessages[child.service] }
        if (child.service === 'academy') {
            if (child.campus_interest === 'yes' && !isAllowedEnrollmentPayment('campus', child.campus_payment_choice)) return { success: false, error: paymentMessages.campus }
            if (child.tournament_interest === 'yes' && !isAllowedEnrollmentPayment('tournament', child.tournament_payment_choice)) return { success: false, error: paymentMessages.tournament }
        }
    }

    const authDb=await createClient()
    const {data:{user}}=await authDb.auth.getUser()
    const rows = []
    const seen = new Set<string>()
    for (const child of parsed.data.children) {
        const identity = `${child.child_name.toLocaleLowerCase()}|${child.birth_date}|${child.service}`
        if (seen.has(identity)) return { success: false, error: `Has añadido dos veces a ${child.child_name}. Revisa los jugadores.` }
        seen.add(identity)
        const activity = await resolveActivity(child.service, child.activity_id || undefined)
        if (!activity) return { success: false, error: `La actividad de ${child.child_name} ya no está disponible. Elige otra opción.` }
        if(child.linked_child_id) {
            const {data:linked}=await authDb.rpc('is_guardian_of',{child_uuid:child.linked_child_id})
            if(linked!==true) return {success:false,error:'El jugador no pertenece a tu cuenta.'}
            const {data:existing}=await authDb.from('children').select('full_name,birth_date').eq('id',child.linked_child_id).is('archived_at',null).single()
            if(!existing) return {success:false,error:'Jugador no disponible.'}
            child.child_name=existing.full_name
            if(existing.birth_date) child.birth_date=existing.birth_date
        }
        let academyDetails = null
        if(child.service==='academy') {
            try { academyDetails=await academySelection({plan_id:child.plan_id||'',group_id:child.group_id||'',second_group_id:child.second_group_id,start_date:child.start_date||'',plus:child.plus==='yes',offer_version:child.offer_version||'',payment_choice:child.payment_choice!},child.birth_date) }
            catch(e) { return {success:false,error:e instanceof Error?e.message:'Revisa tu elección de Academia.'} }
        }
        if(child.linked_child_id) {
            const authDb=await createClient()
            const {data:linked}=await authDb.rpc('is_guardian_of',{child_uuid:child.linked_child_id})
            if(linked!==true) return {success:false,error:'El jugador no pertenece a tu cuenta.'}
        }
        const requestedPayments: Partial<Record<PaymentService, EnrollmentPayment>> = { [child.service]: child.payment_choice as EnrollmentPayment }
        if (child.service === 'academy') {
            if (child.campus_interest === 'yes') requestedPayments.campus = child.campus_payment_choice as EnrollmentPayment
            if (child.tournament_interest === 'yes') requestedPayments.tournament = child.tournament_payment_choice as EnrollmentPayment
        }
        const extraServices = Object.keys(requestedPayments).filter(service => service !== child.service)
        rows.push({
            academy_details: academyDetails ? { ...academyDetails, requested_payments: requestedPayments } : null,
            campus_details: child.service === 'campus' ? { payment_choice: child.payment_choice } : null,
            submitted_by:user?.id||null,
            id: crypto.randomUUID(),
            service: child.service,
            activity_id: activity.id || null,
            activity_name: extraServices.length ? Object.keys(requestedPayments).map(service => paymentServiceLabels[service as PaymentService]).join(' + ') : activity.name,
            child_name: child.child_name,
            linked_child_id: child.linked_child_id || null,
            birth_date: child.birth_date,
            guardian_name: parsed.data.guardian_name,
            email: parsed.data.email.toLowerCase(),
            phone: parsed.data.phone,
            notes: [parsed.data.notes, `Formas de pago solicitadas:\n${paymentChoicesText(requestedPayments)}`, extraServices.length ? 'Actividades adicionales pendientes de concretar con Secretaría: ' + extraServices.map(service => paymentServiceLabels[service as PaymentService]).join(', ') + '. Aceptar Academia no confirma las plazas adicionales.' : '', academyDetails ? `Plan: ${academyDetails.plan.name} · ${academyDetails.quote.monthly_price} €/mes\nGrupos: ${academyDetails.groups.map(g=>g.public_offer.day+' '+g.schedule+' '+g.name).join('; ')}\nIncorporación: ${academyDetails.start_date} · Primera cuota: ${academyDetails.quote.first_month} € (${academyDetails.quote.percent} %)\nMatrícula nuevos jugadores: ${academyDetails.quote.enrollment_fee} € · Plus: ${academyDetails.quote.plus} €\nPago solicitado: ${academyDetails.payment_choice==='monthly_card'?'Mensualidades con tarjeta':'Efectivo'} · Fin: ${academyDetails.quote.season_end}` : ''].filter(Boolean).join('\n') || null,
            status: 'new',
        })
    }

    const supabase = createAdminClient()
    // One insert is atomic: either every child's request is saved or none is.
    const { error } = await supabase.from('enrollment_requests').insert(rows)

    if (error) {
        console.error('Enrollment request error:', error)
        return { success: false, error: 'No se pudo enviar la solicitud. Inténtalo de nuevo o contacta con la academia.' }
    }

    await Promise.all(rows.map(row => deliverRegistrationEmails('enrollment', row.id)))

    return {
        success: true,
        message: parsed.data.children.some(child => child.service === 'academy' && (child.campus_interest === 'yes' || child.tournament_interest === 'yes')) ? 'Solicitud recibida con una forma de pago para cada actividad. Secretaría revisará Academia y contactará contigo para concretar las demás plazas. No se ha realizado ningún cobro.' : rows.length > 1
            ? `Hemos recibido tus ${rows.length} solicitudes. Secretaría revisará cada plaza y contactará contigo para confirmar los siguientes pasos.`
            : 'Solicitud recibida. Secretaría revisará la plaza y contactará contigo para confirmar los siguientes pasos.',
    }
}
