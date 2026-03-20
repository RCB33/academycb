'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// ─── ACADEMY SETTINGS ───

export async function getSettings() {
    const supabase = await createClient()
    const { data } = await supabase
        .from('academy_settings')
        .select('key, value')

    const settings: Record<string, string> = {}
    for (const row of data || []) {
        settings[row.key] = row.value || ''
    }
    return settings
}

export async function updateSettings(updates: Record<string, string>) {
    const supabase = await createClient()

    for (const [key, value] of Object.entries(updates)) {
        await supabase
            .from('academy_settings')
            .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' })
    }

    revalidatePath('/admin/ajustes')
    return { success: true }
}

// ─── MEMBERSHIP PLANS ───

export type MembershipPlan = {
    id: string
    name: string
    duration_months: number
    price: number | null
    frequency: string
    created_at: string
}

export async function getPlans(): Promise<MembershipPlan[]> {
    const supabase = await createClient()
    const { data } = await supabase
        .from('membership_plans')
        .select('*')
        .order('name')

    return (data || []) as MembershipPlan[]
}

export async function createPlan(data: { name: string; duration_months: number; price: number; frequency: string }) {
    const supabase = await createClient()
    const { error } = await supabase.from('membership_plans').insert([data])

    if (error) {
        console.error("Error creating plan:", error)
        return { success: false, error: "Error al crear el plan" }
    }

    revalidatePath('/admin/ajustes')
    return { success: true }
}

export async function updatePlan(id: string, data: Partial<{ name: string; duration_months: number; price: number; frequency: string }>) {
    const supabase = await createClient()
    const { error } = await supabase.from('membership_plans').update(data).eq('id', id)

    if (error) return { success: false, error: "Error al actualizar" }
    revalidatePath('/admin/ajustes')
    return { success: true }
}

export async function deletePlan(id: string) {
    const supabase = await createClient()
    // Check if in use
    const { count } = await supabase
        .from('academy_memberships')
        .select('*', { count: 'exact', head: true })
        .eq('plan_id', id)

    if (count && count > 0) {
        return { success: false, error: `No se puede eliminar: ${count} alumnos usan este plan.` }
    }

    const { error } = await supabase.from('membership_plans').delete().eq('id', id)
    if (error) return { success: false, error: "Error al eliminar" }
    revalidatePath('/admin/ajustes')
    return { success: true }
}

// ─── CATEGORIES ───

export async function getCategories() {
    const supabase = await createClient()
    const { data } = await supabase
        .from('categories')
        .select('id, name')
        .order('name')
    return data || []
}

export async function createCategory(name: string) {
    const supabase = await createClient()
    const { error } = await supabase.from('categories').insert([{ name }])
    if (error) return { success: false, error: "Error al crear categoría" }
    revalidatePath('/admin/ajustes')
    return { success: true }
}

export async function deleteCategory(id: string) {
    const supabase = await createClient()
    // Check if in use
    const { count } = await supabase
        .from('children')
        .select('*', { count: 'exact', head: true })
        .eq('category_id', id)

    if (count && count > 0) {
        return { success: false, error: `No se puede eliminar: ${count} alumnos en esta categoría.` }
    }

    const { error } = await supabase.from('categories').delete().eq('id', id)
    if (error) return { success: false, error: "Error al eliminar" }
    revalidatePath('/admin/ajustes')
    return { success: true }
}

// ─── EXPENSES ───

export type Expense = {
    id: string
    concept: string
    amount: number
    category: string
    date: string
    notes: string | null
    created_at: string
}

export async function getExpenses(month?: string) {
    const supabase = await createClient()

    let query = supabase
        .from('expenses')
        .select('*')
        .order('date', { ascending: false })

    if (month) {
        // month format: "2026-03"
        query = query.gte('date', `${month}-01`).lte('date', `${month}-31`)
    }

    const { data } = await query
    return (data || []) as Expense[]
}

export async function createExpense(data: { concept: string; amount: number; category: string; date: string; notes?: string }) {
    const supabase = await createClient()
    const { error } = await supabase.from('expenses').insert([data])

    if (error) {
        console.error("Error creating expense:", error)
        return { success: false, error: "Error al crear el gasto" }
    }

    revalidatePath('/admin/finanzas')
    return { success: true }
}

export async function deleteExpense(id: string) {
    const supabase = await createClient()
    const { error } = await supabase.from('expenses').delete().eq('id', id)
    if (error) return { success: false, error: "Error al eliminar" }
    revalidatePath('/admin/finanzas')
    return { success: true }
}

// ─── PAYMENTS (Manual) ───

export async function recordManualPayment(data: {
    child_id: string
    amount: number
    type: string  // 'academy' | 'campus' | 'tournament' | 'shop'
    ref_id: string
    method: string  // 'efectivo' | 'transferencia' | 'stripe'
    description?: string
}) {
    const supabase = await createClient()
    const { error } = await supabase.from('payments').insert([{
        type: data.type,
        ref_id: data.ref_id,
        amount: data.amount,
        status: 'paid',
        method: data.method,
        paid_at: new Date().toISOString(),
        child_id: data.child_id,
        description: data.description || null
    }])

    if (error) {
        console.error("Error recording payment:", error)
        return { success: false, error: "Error al registrar el pago" }
    }

    revalidatePath('/admin/finanzas')
    return { success: true }
}

export async function getMonthlyPaymentGrid(month: string) {
    const supabase = await createClient()

    // 1. Get all active memberships with their children
    const { data: memberships } = await supabase
        .from('academy_memberships')
        .select(`
            id, plan_id, monthly_price, payment_method, status,
            child:children(id, full_name, category:categories(name)),
            plan:membership_plans(name, price, frequency)
        `)
        .eq('status', 'active')

    // 2. Collect membership ids
    const membershipIds = (memberships || []).map((m: any) => m.id)
    if (membershipIds.length === 0) return []

    // 3. Get ALL payments linked to these memberships (both paid & pending)
    const { data: allPayments } = await supabase
        .from('payments')
        .select('*')
        .eq('type', 'academy')
        .in('ref_id', membershipIds)

    // 4. Build grid: for each membership, find the payment matching this month
    const [yearStr, monthStr] = month.split('-')
    const monthIndex = parseInt(monthStr) - 1  // JS months 0-indexed
    const monthNames = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
        'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
    const targetMonthName = monthNames[monthIndex]

    const grid = (memberships || []).map((m: any) => {
        const child = m.child as any
        const plan = m.plan as any
        const price = m.monthly_price || plan?.price || 0

        // Find payment for this membership and this month
        const payment = (allPayments || []).find((p: any) => {
            if (p.ref_id !== m.id) return false
            // Match by description containing month name + year
            const desc = (p.description || '').toLowerCase()
            return desc.includes(targetMonthName) && desc.includes(yearStr)
        })

        return {
            membershipId: m.id,
            childId: child?.id,
            childName: child?.full_name || 'Sin nombre',
            categoryName: child?.category?.name || '',
            planName: plan?.name || '',
            amount: price,
            paymentMethod: m.payment_method,
            status: payment?.status === 'paid' ? 'paid' : payment ? 'pending' : 'no_record',
            paidAt: payment?.paid_at || null,
            paymentId: payment?.id || null
        }
    })

    return grid
}

