'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { requireAdmin, requireMarketingAccess } from '@/lib/auth'
import { createEnrollmentRequest } from '@/lib/enrollment'
import { onboardAcceptedFamily,prepareAcceptedSubscription } from '@/lib/enrollment-onboarding'
import { createAdminClient } from '@/lib/supabase/admin'
import { deliverRegistrationEmails } from '@/lib/registration-email'

export type EnrollmentState = {
    success?: boolean
    error?: string
    message?: string
}

export async function submitEnrollment(_previousState: EnrollmentState, formData: FormData): Promise<EnrollmentState> {
    return createEnrollmentRequest({
        service: formData.get('service'),
        activity_id: formData.get('activity_id') || '',
        child_name: formData.get('child_name'),
        birth_date: formData.get('birth_date'),
        guardian_name: formData.get('guardian_name'),
        email: formData.get('email'),
        phone: formData.get('phone'),
        notes: formData.get('notes') || undefined,
        privacy_consent: formData.get('privacy_consent'),
        terms_consent: formData.get('terms_consent'),
        website: formData.get('website') || '',
    })
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
    revalidatePath('/admin/campus/solicitudes')
    revalidatePath('/admin/actividades')
    return { success: true }
}

export async function convertEnrollmentRequest(id: string) {
    const { supabase,user } = await requireAdmin()
    const parsedId = z.string().uuid().safeParse(id)
    if (!parsedId.success) return { success: false, error: 'Solicitud no válida.' }

    const {data:request,error:requestError}=await supabase.from('enrollment_requests').select('service,activity_id,campus_details,academy_details,email').eq('id',parsedId.data).single()
    if(requestError || !request)return {success:false,error:'No se pudo cargar la solicitud.'}
    if(request.service==='campus') {
        if(!request.activity_id || request.campus_details)return {success:false,error:'Revisa y acepta esta solicitud desde Campus → Solicitudes, indicando su edición y el importe de las semanas.'}
        const {data:enrollmentId,error}=await supabase.rpc('accept_campus_request',{request_uuid:parsedId.data})
        if(error)return {success:false,error:error.message}
        const {data:enrollment}=await supabase.from('campus_enrollments').select('child_id').eq('id',enrollmentId).single()
        const access=enrollment?.child_id?await onboardAcceptedFamily(enrollment.child_id,request.email):{error:'Plaza aceptada. Revisa el acceso del tutor.',status:undefined}
        await createAdminClient().from('enrollment_requests').update({campus_details:{onboarding:{access:access.status||'needs_review'}}}).eq('id',parsedId.data)
        await deliverRegistrationEmails('enrollment', parsedId.data)
        for(const path of ['/admin/leads','/admin/campus','/admin/campus/solicitudes','/admin/actividades','/admin/crm/alumnos','/admin/crm/tutores','/admin/finanzas'])revalidatePath(path)
        return {success:true,childId:enrollment?.child_id,notice:access.error||'Plaza aceptada. Revisa el envío en Estado de correos.'}
    }

    const { data: childId, error } = await supabase.rpc(request.service==='academy'&&request.academy_details?'accept_academy_request':'convert_enrollment_request', {
        request_uuid: parsedId.data,
    })
    if (error) return { success: false, error: error.message }
    let notice = ''
    if(request.service==='academy'&&request.academy_details) {
        const access=await onboardAcceptedFamily(childId,request.email)
        const billing=access.guardianId?await prepareAcceptedSubscription(parsedId.data,user.id,childId,access.guardianId):{status:'pending_access'}
        notice=access.error||('error' in billing?billing.error:'')||((billing.status==='pending_activation')?'Plaza aceptada y recibos creados. La activación de las mensualidades Stripe sigue pendiente.':'Plaza aceptada, jugador vinculado y recibos pendientes creados.')
        const db=createAdminClient()
        const {data:latest}=await db.from('enrollment_requests').select('academy_details').eq('id',parsedId.data).single()
        if(latest?.academy_details) await db.from('enrollment_requests').update({academy_details:{...latest.academy_details,onboarding:{access:access.status||'needs_review',billing:billing.status||'needs_review',billing_request_id:'requestId' in billing?billing.requestId:null}}}).eq('id',parsedId.data)
    }
    await deliverRegistrationEmails('enrollment', parsedId.data)

    for(const path of ['/admin/gestion','/admin/academia','/admin/finanzas','/portal']) revalidatePath(path,'layout')
    revalidatePath('/admin/leads')
    revalidatePath('/admin/crm/alumnos')
    revalidatePath('/admin/crm/tutores')
    return { success: true, childId,notice }
}
