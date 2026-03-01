'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function getStudentPayments(childId: string) {
    const supabase = await createClient()

    // Fetch Memberships (Cuotas)
    const { data: memberships, error } = await supabase
        .from('academy_memberships')
        .select(`
            *,
            plan:membership_plans(name, price)
        `)
        .eq('child_id', childId)
        .order('start_date', { ascending: false })

    if (error) {
        console.error('Error fetching payments:', error)
        return []
    }

    return memberships
}

export async function createManualPayment(childId: string, data: any) {
    const supabase = await createClient()

    // 1. Create a "Custom" membership/fee if needed, or just log a payment?
    // For simplicity, we'll assume we are creating a membership record acting as a "Charge"
    // But ideally we should have a generic "charges" table. 
    // We'll use academy_memberships as "Charges" for now since it links to plans.

    // Check if "Manual Payment" plan exists, if not create one or use a default.
    // This is a simplification. Real app would have better structure.

    // For now, let's just insert into academy_memberships with a specific plan.
    // We'll assume the UI passes a valid plan_id.

    const { error } = await supabase
        .from('academy_memberships')
        .insert({
            child_id: childId,
            plan_id: data.plan_id,
            start_date: data.start_date,
            end_date: data.end_date,
            status: 'active',
            payment_status: data.payment_status || 'pending'
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
