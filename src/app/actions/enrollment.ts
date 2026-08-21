'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { requireAdmin, requireMarketingAccess } from '@/lib/auth'
import { createEnrollmentRequest } from '@/lib/enrollment'

export type EnrollmentState = {
    success?: boolean
    error?: string
    message?: string
}

const initialState: EnrollmentState = {}
export { initialState as enrollmentInitialState }

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
        consent: formData.get('consent'),
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
