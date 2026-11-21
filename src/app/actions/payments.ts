'use server'

import { requireFinanceAccess } from '@/lib/auth'

export async function getStudentPayments(childId: string) {
    const { supabase } = await requireFinanceAccess()

    // Fetch Memberships (Cuotas / Suscripciones)
    const { data: memberships, error: membershipsError } = await supabase
        .from('academy_memberships')
        .select(`
            *,
            plan:membership_plans(name, price, frequency, duration_months)
        `)
        .eq('child_id', childId)
        .order('start_date', { ascending: false })

    // Fetch individual payments from payments table
    const { data: paymentRecords, error: paymentsError } = await supabase
        .from('payments')
        .select('*, manual_receipt_allocations(id,batch_id,amount,paid_date,method,voided_at)')
        .eq('child_id', childId)
        .order('created_at', { ascending: false })

    return {
        memberships: memberships || [],
        payments: paymentRecords || [],
        error: membershipsError || paymentsError ? 'No se pudieron consultar todos los recibos y cuotas. Recarga la ficha para revisar los pagos.' : undefined
    }
}
