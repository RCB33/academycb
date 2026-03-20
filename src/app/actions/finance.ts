'use server'

import { createClient } from '@/lib/supabase/server'

export type FinanceTransaction = {
    id: string
    type: 'cuota' | 'campus' | 'torneo' | 'tienda' | 'pago'
    concept: string
    amount: number
    status: 'paid' | 'pending' | 'cancelled'
    date: string
}

export type FinanceKPIs = {
    totalRevenue: number
    pendingPayments: number
    activeStudents: number
    monthlyExpenses: number
    revenueBySource: { source: string; amount: number }[]
}

export async function getFinanceKPIs(): Promise<FinanceKPIs> {
    const supabase = await createClient()

    // 1. Cuotas academia (memberships paid)
    const { data: memberships } = await supabase
        .from('academy_memberships')
        .select('payment_status, plan:membership_plans(price)')

    let cuotasPaid = 0, cuotasPending = 0, activeStudents = 0
    if (memberships) {
        for (const m of memberships) {
            const price = (m.plan as any)?.price || 0
            if (m.payment_status === 'paid') { cuotasPaid += price; activeStudents++ }
            else if (m.payment_status === 'pending') cuotasPending += price
        }
    }

    // 2. Campus enrollments (confirmed = paid)
    const { data: campusEnrollments } = await supabase
        .from('campus_enrollments')
        .select('status, campus:campuses(price)')

    let campusPaid = 0, campusPending = 0
    if (campusEnrollments) {
        for (const e of campusEnrollments) {
            const price = (e.campus as any)?.price || 0
            if (e.status === 'confirmed') campusPaid += price
            else if (e.status === 'pending_payment' || e.status === 'reserved') campusPending += price
        }
    }

    // 3. Torneos (confirmed teams)
    const { data: tournamentTeams } = await supabase
        .from('tournament_teams')
        .select('status, tournament:tournaments_internal(price)')

    let torneosPaid = 0, torneosPending = 0
    if (tournamentTeams) {
        for (const t of tournamentTeams) {
            const price = (t.tournament as any)?.price || 0
            if (t.status === 'confirmed') torneosPaid += price
            else if (t.status === 'registered') torneosPending += price
        }
    }

    // 4. Tienda (orders)
    const { data: orders } = await supabase
        .from('orders')
        .select('total_amount, status')

    let tiendaPaid = 0, tiendaPending = 0
    if (orders) {
        for (const o of orders) {
            const amount = o.total_amount || 0
            if (o.status === 'completed' || o.status === 'paid') tiendaPaid += amount
            else if (o.status === 'pending') tiendaPending += amount
        }
    }

    // 5. Pagos directos
    const { data: payments } = await supabase
        .from('payments')
        .select('amount, status')

    let pagosPaid = 0, pagosPending = 0
    if (payments) {
        for (const p of payments) {
            if (p.status === 'paid' || p.status === 'completed') pagosPaid += (p.amount || 0)
            else if (p.status === 'pending') pagosPending += (p.amount || 0)
        }
    }

    const totalRevenue = cuotasPaid + campusPaid + torneosPaid + tiendaPaid + pagosPaid
    const pendingPayments = cuotasPending + campusPending + torneosPending + tiendaPending + pagosPending

    return {
        totalRevenue,
        pendingPayments,
        activeStudents,
        monthlyExpenses: 0,
        revenueBySource: [
            { source: 'Cuotas', amount: cuotasPaid },
            { source: 'Campus', amount: campusPaid },
            { source: 'Torneos', amount: torneosPaid },
            { source: 'Tienda', amount: tiendaPaid },
            { source: 'Pagos', amount: pagosPaid },
        ]
    }
}

export async function getFinanceTransactions(): Promise<FinanceTransaction[]> {
    const supabase = await createClient()
    const transactions: FinanceTransaction[] = []

    // 1. Cuotas
    const { data: memberships } = await supabase
        .from('academy_memberships')
        .select('id, payment_status, created_at, child:children(full_name), plan:membership_plans(name, price)')
        .order('created_at', { ascending: false })
        .limit(30)

    if (memberships) {
        for (const m of memberships) {
            transactions.push({
                id: m.id,
                type: 'cuota',
                concept: `${(m.child as any)?.full_name || 'Alumno'} - ${(m.plan as any)?.name || 'Cuota'}`,
                amount: (m.plan as any)?.price || 0,
                status: m.payment_status === 'paid' ? 'paid' : m.payment_status === 'pending' ? 'pending' : 'cancelled',
                date: m.created_at
            })
        }
    }

    // 2. Campus
    const { data: campusEnrollments } = await supabase
        .from('campus_enrollments')
        .select('id, status, created_at, child:children(full_name), campus:campuses(name, price)')
        .order('created_at', { ascending: false })
        .limit(30)

    if (campusEnrollments) {
        for (const e of campusEnrollments) {
            transactions.push({
                id: e.id,
                type: 'campus',
                concept: `${(e.child as any)?.full_name || 'Alumno'} - ${(e.campus as any)?.name || 'Campus'}`,
                amount: (e.campus as any)?.price || 0,
                status: e.status === 'confirmed' ? 'paid' : e.status === 'cancelled' ? 'cancelled' : 'pending',
                date: e.created_at
            })
        }
    }

    // 3. Torneos
    const { data: tournamentTeams } = await supabase
        .from('tournament_teams')
        .select('id, status, team_name, created_at, tournament:tournaments_internal(title, price)')
        .order('created_at', { ascending: false })
        .limit(30)

    if (tournamentTeams) {
        for (const t of tournamentTeams) {
            transactions.push({
                id: t.id,
                type: 'torneo',
                concept: `${t.team_name} - ${(t.tournament as any)?.title || 'Torneo'}`,
                amount: (t.tournament as any)?.price || 0,
                status: t.status === 'confirmed' ? 'paid' : t.status === 'cancelled' ? 'cancelled' : 'pending',
                date: t.created_at
            })
        }
    }

    // 4. Tienda
    const { data: orders } = await supabase
        .from('orders')
        .select('id, customer_name, total_amount, status, created_at')
        .order('created_at', { ascending: false })
        .limit(30)

    if (orders) {
        for (const o of orders) {
            transactions.push({
                id: o.id,
                type: 'tienda',
                concept: `Pedido - ${o.customer_name}`,
                amount: o.total_amount || 0,
                status: (o.status === 'completed' || o.status === 'paid') ? 'paid' : o.status === 'pending' ? 'pending' : 'cancelled',
                date: o.created_at
            })
        }
    }

    // Sort by date desc, take top 50
    transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    return transactions.slice(0, 50)
}
