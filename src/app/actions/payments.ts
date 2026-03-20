'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function getStudentPayments(childId: string) {
    const supabase = await createClient()

    // Fetch Memberships (Cuotas / Suscripciones)
    const { data: memberships } = await supabase
        .from('academy_memberships')
        .select(`
            *,
            plan:membership_plans(name, price, frequency)
        `)
        .eq('child_id', childId)
        .order('start_date', { ascending: false })

    // Fetch individual payments from payments table
    const { data: paymentRecords } = await supabase
        .from('payments')
        .select('*')
        .eq('child_id', childId)
        .order('created_at', { ascending: false })

    return {
        memberships: memberships || [],
        payments: paymentRecords || []
    }
}

export async function createManualPayment(childId: string, data: any) {
    const supabase = await createClient()

    const { error } = await supabase
        .from('academy_memberships')
        .insert({
            child_id: childId,
            plan_id: data.plan_id,
            start_date: data.start_date,
            end_date: data.end_date,
            status: 'active',
            payment_status: data.payment_status || 'pending',
            payment_method: data.payment_method || 'efectivo',
            monthly_price: data.monthly_price || null
        })

    if (error) return { success: false, error: error.message }

    revalidatePath(`/admin/crm/alumnos/${childId}`)
    return { success: true }
}

export async function updatePaymentStatus(membershipId: string, status: string, childId: string) {
    const supabase = await createClient()

    const { error } = await supabase
        .from('academy_memberships')
        .update({ payment_status: status })
        .eq('id', membershipId)

    if (error) return { success: false, error: error.message }

    revalidatePath(`/admin/crm/alumnos/${childId}`)
    return { success: true }
}

export async function markPaymentAsPaid(paymentId: string) {
    const supabase = await createClient()

    const { error } = await supabase
        .from('payments')
        .update({ status: 'paid', paid_at: new Date().toISOString() })
        .eq('id', paymentId)

    if (error) return { success: false, error: error.message }

    revalidatePath('/admin/finanzas')
    return { success: true }
}
