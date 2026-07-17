'use server'

import { requireFinanceAccess } from '@/lib/auth'

export async function getStudentPayments(childId: string) {
    const { supabase } = await requireFinanceAccess()

    // Fetch Memberships (Cuotas / Suscripciones)
    const { data: memberships } = await supabase
        .from('academy_memberships')
        .select(`
            *,
            plan:membership_plans(name, price, frequency, duration_months)
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
