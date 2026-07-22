'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import type { SupabaseClient } from '@supabase/supabase-js'
import { requireFinanceAccess } from '@/lib/auth'

const FinanceMonthSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/)
const PaymentStatusSchema = z.enum(['paid', 'pending'])
const PaymentTypeSchema = z.enum(['academy', 'campus', 'tournament', 'shop', 'other'])
const PaymentMethodSchema = z.enum(['cash', 'efectivo', 'transfer', 'transferencia', 'stripe', 'tarjeta'])

const ExpenseSchema = z.object({
    concept: z.string().trim().min(2).max(160),
    amount: z.number().finite().positive().max(1_000_000),
    category: z.string().trim().min(2).max(80),
    date: z.string().date(),
    notes: z.string().trim().max(500).optional().default(''),
})

const ManualPaymentSchema = z.object({
    child_id: z.string().uuid().optional().nullable(),
    amount: z.number().finite().positive().max(1_000_000),
    type: PaymentTypeSchema,
    method: PaymentMethodSchema,
    description: z.string().trim().min(3).max(240),
    date: z.string().date(),
})

export type FinanceTransactionStatus = 'paid' | 'pending' | 'overdue' | 'cancelled' | 'refunded' | 'failed'
export type FinanceTransactionType = 'cuota' | 'campus' | 'torneo' | 'tienda' | 'pago' | 'gasto'

export type FinanceTransaction = {
    id: string
    type: FinanceTransactionType
    concept: string
    amount: number
    status: FinanceTransactionStatus
    date: string
    method?: string | null
    paymentId?: string
}

export type FinanceKPIs = {
    period: string
    totalRevenue: number
    pendingPayments: number
    overduePayments: number
    overdueCount: number
    activeStudents: number
    monthlyExpenses: number
    netProfit: number
    collectionRate: number
    revenueBySource: { source: string; amount: number }[]
}

export type Expense = {
    id: string
    concept: string
    amount: number
    category: string
    date: string
    notes: string | null
    created_at: string
}

export type MonthlyPaymentRow = {
    membershipId: string
    childId: string | null
    childName: string
    categoryName: string
    planName: string
    amount: number
    paymentMethod: string | null
    status: FinanceTransactionStatus
    paidAt: string | null
    paymentId: string
    dueDate: string | null
}

export type FinanceStudentOption = { id: string; full_name: string }

type SourceTotals = Record<'Cuotas' | 'Campus' | 'Torneos' | 'Tienda' | 'Otros', number>

type PaymentRecord = {
    id: string
    type: string
    ref_id: string | null
    child_id?: string | null
    amount: number | string | null
    status: string
    method: string | null
    paid_at: string | null
    due_date: string | null
    description: string | null
    created_at: string
    child?: { full_name: string } | null
}

type CampusEnrollmentRecord = {
    id: string
    status: string
    created_at: string
    child: { full_name: string } | null
    campus: { name: string; price: number | string | null } | null
}

type TournamentTeamRecord = {
    id: string
    status: string
    team_name: string | null
    created_at: string
    tournament: { title: string; price: number | string | null } | null
}

type OrderRecord = {
    id: string
    customer_name: string | null
    total_amount: number | string | null
    status: string
    payment_method: string | null
    created_at: string
}

type AcademyMembershipRecord = {
    id: string
    child_id: string | null
    payment_method: string | null
    child: {
        id: string
        full_name: string
        category: { name: string } | null
    } | null
    plan: { name: string } | null
}

function getMonthRange(monthInput: string) {
    const parsed = FinanceMonthSchema.safeParse(monthInput)
    if (!parsed.success) throw new Error('Periodo financiero no válido')

    const [year, month] = parsed.data.split('-').map(Number)
    const start = new Date(Date.UTC(year, month - 1, 1))
    const next = new Date(Date.UTC(year, month, 1))

    return {
        month: parsed.data,
        startIso: start.toISOString(),
        nextIso: next.toISOString(),
        startDate: start.toISOString().slice(0, 10),
        nextDate: next.toISOString().slice(0, 10),
        startMs: start.getTime(),
        nextMs: next.getTime(),
    }
}

function isInRange(value: string | null | undefined, startMs: number, nextMs: number) {
    if (!value) return false
    const time = new Date(value).getTime()
    return Number.isFinite(time) && time >= startMs && time < nextMs
}

function numberValue(value: unknown) {
    const result = Number(value || 0)
    return Number.isFinite(result) ? result : 0
}

function paymentSource(type: string): keyof SourceTotals {
    if (type === 'academy') return 'Cuotas'
    if (type === 'campus') return 'Campus'
    if (type === 'tournament') return 'Torneos'
    if (type === 'shop') return 'Tienda'
    return 'Otros'
}

function transactionType(type: string): FinanceTransactionType {
    if (type === 'academy') return 'cuota'
    if (type === 'campus') return 'campus'
    if (type === 'tournament') return 'torneo'
    if (type === 'shop') return 'tienda'
    return 'pago'
}

function getPaymentDate(payment: PaymentRecord) {
    if (payment.status === 'paid') return payment.paid_at || payment.due_date || payment.created_at
    return payment.due_date || payment.created_at
}

function overdueCutoff(graceDays = 0) {
    const cutoff = new Date()
    cutoff.setHours(0, 0, 0, 0)
    cutoff.setDate(cutoff.getDate() - Math.max(0, graceDays))
    return cutoff.toISOString().slice(0, 10)
}

function getPaymentStatus(payment: Pick<PaymentRecord, 'status' | 'due_date'>, graceDays = 0): FinanceTransactionStatus {
    if (payment.status === 'paid') return 'paid'
    if (payment.status === 'refunded') return 'refunded'
    if (payment.status === 'cancelled') return 'cancelled'
    if (payment.status === 'failed') return 'failed'
    if (payment.status === 'pending' && payment.due_date && payment.due_date < overdueCutoff(graceDays)) return 'overdue'
    return 'pending'
}

function linkedKey(type: string, refId: string | null) {
    return refId ? `${type}:${refId}` : null
}

function logQueryError(scope: string, error: unknown) {
    if (error) console.error(`Finance query failed (${scope}):`, error)
}

export async function getFinanceOverview(monthInput: string): Promise<{
    kpis: FinanceKPIs
    transactions: FinanceTransaction[]
    expenses: Expense[]
    students: FinanceStudentOption[]
}> {
    const { supabase } = await requireFinanceAccess()
    const range = getMonthRange(monthInput)

    const [paymentsResult, membershipsResult, campusResult, tournamentResult, ordersResult, expensesResult, studentsResult, graceResult] = await Promise.all([
        supabase.from('payments').select('id, type, ref_id, child_id, amount, status, method, paid_at, due_date, description, created_at, child:children(full_name)'),
        supabase.from('academy_memberships').select('id, child_id, status').eq('status', 'active'),
        supabase.from('campus_enrollments').select('id, status, created_at, child:children(full_name), campus:campuses(name, price)'),
        supabase.from('tournament_teams').select('id, status, team_name, created_at, tournament:tournaments_internal(title, price)'),
        supabase.from('orders').select('id, customer_name, total_amount, status, payment_method, created_at'),
        supabase.from('expenses').select('id, concept, amount, category, date, notes, created_at').is('deleted_at', null).gte('date', range.startDate).lt('date', range.nextDate).order('date', { ascending: false }),
        supabase.from('children').select('id, full_name').order('full_name'),
        supabase.from('academy_settings').select('value').eq('key', 'billing_grace_days').maybeSingle(),
    ])

    logQueryError('payments', paymentsResult.error)
    logQueryError('memberships', membershipsResult.error)
    logQueryError('campus', campusResult.error)
    logQueryError('tournaments', tournamentResult.error)
    logQueryError('orders', ordersResult.error)
    logQueryError('expenses', expensesResult.error)
    logQueryError('students', studentsResult.error)

    const payments = paymentsResult.data || []
    const graceDays = Number(graceResult.data?.value || 0)
    const expenses = (expensesResult.data || []) as Expense[]
    const sourceTotals: SourceTotals = { Cuotas: 0, Campus: 0, Torneos: 0, Tienda: 0, Otros: 0 }
    const transactions: FinanceTransaction[] = []
    const linkedPayments = new Set<string>()
    let totalRevenue = 0
    let pendingPayments = 0
    let overduePayments = 0
    let overdueCount = 0

    for (const payment of payments as unknown as PaymentRecord[]) {
        const key = linkedKey(payment.type, payment.ref_id)
        if (key) linkedPayments.add(key)

        const amount = numberValue(payment.amount)
        const financialDate = getPaymentDate(payment)
        const normalizedStatus = getPaymentStatus(payment, graceDays)
        const inPeriod = isInRange(financialDate, range.startMs, range.nextMs)

        if (payment.status === 'paid' && isInRange(payment.paid_at || financialDate, range.startMs, range.nextMs)) {
            totalRevenue += amount
            sourceTotals[paymentSource(payment.type)] += amount
        } else if (payment.status === 'pending' && inPeriod) {
            pendingPayments += amount
        } else if (payment.status === 'failed' && inPeriod) {
            pendingPayments += amount
        }

        if (normalizedStatus === 'overdue') {
            overduePayments += amount
            overdueCount += 1
        }

        if (inPeriod) {
            const child = payment.child
            transactions.push({
                id: payment.id,
                type: transactionType(payment.type),
                concept: payment.description || `${child?.full_name || 'Ingreso'} · ${paymentSource(payment.type)}`,
                amount,
                status: normalizedStatus,
                date: financialDate,
                method: payment.method,
                paymentId: payment.id,
            })
        }
    }

    const addFallback = (entry: {
        key: string
        id: string
        type: FinanceTransactionType
        source: keyof SourceTotals
        concept: string
        amount: number
        status: FinanceTransactionStatus
        date: string
        method?: string | null
    }) => {
        if (linkedPayments.has(entry.key) || !isInRange(entry.date, range.startMs, range.nextMs)) return
        if (entry.status === 'paid') {
            totalRevenue += entry.amount
            sourceTotals[entry.source] += entry.amount
        } else if (entry.status === 'pending') {
            pendingPayments += entry.amount
        }
        transactions.push({
            id: entry.id,
            type: entry.type,
            concept: entry.concept,
            amount: entry.amount,
            status: entry.status,
            date: entry.date,
            method: entry.method,
        })
    }

    for (const enrollment of (campusResult.data || []) as unknown as CampusEnrollmentRecord[]) {
        const campus = enrollment.campus
        const child = enrollment.child
        addFallback({
            key: `campus:${enrollment.id}`,
            id: enrollment.id,
            type: 'campus',
            source: 'Campus',
            concept: `${child?.full_name || 'Alumno'} · ${campus?.name || 'Campus'}`,
            amount: numberValue(campus?.price),
            status: enrollment.status === 'confirmed' ? 'paid' : enrollment.status === 'cancelled' ? 'cancelled' : 'pending',
            date: enrollment.created_at,
        })
    }

    for (const team of (tournamentResult.data || []) as unknown as TournamentTeamRecord[]) {
        const tournament = team.tournament
        addFallback({
            key: `tournament:${team.id}`,
            id: team.id,
            type: 'torneo',
            source: 'Torneos',
            concept: `${team.team_name || 'Equipo'} · ${tournament?.title || 'Torneo'}`,
            amount: numberValue(tournament?.price),
            status: team.status === 'confirmed' ? 'paid' : team.status === 'cancelled' ? 'cancelled' : 'pending',
            date: team.created_at,
        })
    }

    for (const order of (ordersResult.data || []) as unknown as OrderRecord[]) {
        const paid = ['paid', 'shipped', 'completed'].includes(order.status)
        addFallback({
            key: `shop:${order.id}`,
            id: order.id,
            type: 'tienda',
            source: 'Tienda',
            concept: `Pedido · ${order.customer_name || 'Cliente'}`,
            amount: numberValue(order.total_amount),
            status: paid ? 'paid' : order.status === 'cancelled' ? 'cancelled' : 'pending',
            date: order.created_at,
            method: order.payment_method,
        })
    }

    const monthlyExpenses = expenses.reduce((sum, expense) => sum + numberValue(expense.amount), 0)
    for (const expense of expenses) {
        transactions.push({
            id: expense.id,
            type: 'gasto',
            concept: expense.concept,
            amount: -numberValue(expense.amount),
            status: 'paid',
            date: expense.date,
            method: expense.category,
        })
    }

    transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    const activeStudents = new Set((membershipsResult.data || []).map((membership) => membership.child_id)).size
    const collectionBase = totalRevenue + pendingPayments

    return {
        kpis: {
            period: range.month,
            totalRevenue,
            pendingPayments,
            overduePayments,
            overdueCount,
            activeStudents,
            monthlyExpenses,
            netProfit: totalRevenue - monthlyExpenses,
            collectionRate: collectionBase > 0 ? Math.round((totalRevenue / collectionBase) * 100) : 0,
            revenueBySource: Object.entries(sourceTotals).map(([source, amount]) => ({ source, amount })),
        },
        transactions: transactions.slice(0, 100),
        expenses,
        students: (studentsResult.data || []) as FinanceStudentOption[],
    }
}

export async function getMonthlyPaymentGrid(monthInput: string): Promise<MonthlyPaymentRow[]> {
    const { supabase } = await requireFinanceAccess()
    const range = getMonthRange(monthInput)

    const [{ data: memberships, error: membershipError }, { data: graceSetting }] = await Promise.all([
        supabase
        .from('academy_memberships')
        .select('id, child_id, payment_method, status, child:children(id, full_name, category:categories(name)), plan:membership_plans(name)')
        .eq('status', 'active'),
        supabase.from('academy_settings').select('value').eq('key', 'billing_grace_days').maybeSingle(),
    ])

    if (membershipError || !memberships?.length) {
        logQueryError('monthly memberships', membershipError)
        return []
    }

    const membershipMap = new Map(
        (memberships as unknown as AcademyMembershipRecord[]).map((membership) => [membership.id, membership])
    )
    const { data: payments, error: paymentsError } = await supabase
        .from('payments')
        .select('id, ref_id, amount, status, method, paid_at, due_date, description, created_at')
        .eq('type', 'academy')
        .in('ref_id', [...membershipMap.keys()])

    if (paymentsError) {
        logQueryError('monthly payments', paymentsError)
        return []
    }

    return (payments || [])
        .filter((payment) => isInRange(payment.due_date || payment.created_at, range.startMs, range.nextMs))
        .map((payment) => {
            const membership = membershipMap.get(payment.ref_id)
            const child = membership?.child
            const category = child?.category
            const plan = membership?.plan
            return {
                membershipId: payment.ref_id,
                childId: child?.id || null,
                childName: child?.full_name || 'Sin nombre',
                categoryName: category?.name || '',
                planName: plan?.name || '',
                amount: numberValue(payment.amount),
                paymentMethod: payment.method || membership?.payment_method || null,
                status: getPaymentStatus(payment, Number(graceSetting?.value || 0)),
                paidAt: payment.paid_at || null,
                paymentId: payment.id,
                dueDate: payment.due_date || null,
            } satisfies MonthlyPaymentRow
        })
        .sort((a, b) => a.childName.localeCompare(b.childName, 'es'))
}

async function syncAcademyMembership(supabase: SupabaseClient, membershipId: string) {
    const [{ data: receipts }, { data: graceSetting }] = await Promise.all([
        supabase
        .from('payments')
        .select('status, due_date')
        .eq('type', 'academy')
        .eq('ref_id', membershipId),
        supabase.from('academy_settings').select('value').eq('key', 'billing_grace_days').maybeSingle(),
    ])

    if (!receipts?.length) return

    const cutoff = overdueCutoff(Number(graceSetting?.value || 0))
    const paymentStatus = receipts.every((receipt) => receipt.status === 'paid')
        ? 'paid'
        : receipts.some((receipt) => receipt.status === 'pending' && receipt.due_date && receipt.due_date < cutoff)
            ? 'overdue'
            : 'pending'

    await supabase.from('academy_memberships').update({ payment_status: paymentStatus }).eq('id', membershipId)
}

export async function setPaymentStatus(paymentId: string, statusInput: 'paid' | 'pending') {
    const parsedId = z.string().uuid().safeParse(paymentId)
    const parsedStatus = PaymentStatusSchema.safeParse(statusInput)
    if (!parsedId.success || !parsedStatus.success) return { success: false, error: 'Cobro no válido' }

    const { supabase } = await requireFinanceAccess()
    const { data: payment, error: readError } = await supabase
        .from('payments')
        .select('id, type, ref_id')
        .eq('id', parsedId.data)
        .single()

    if (readError || !payment) return { success: false, error: 'No se encontró el cobro' }

    const { error } = await supabase
        .from('payments')
        .update({
            status: parsedStatus.data,
            paid_at: parsedStatus.data === 'paid' ? new Date().toISOString() : null,
            updated_at: new Date().toISOString(),
        })
        .eq('id', parsedId.data)

    if (error) return { success: false, error: 'No se pudo actualizar el cobro' }
    if (payment.type === 'academy' && payment.ref_id) await syncAcademyMembership(supabase, payment.ref_id)

    revalidatePath('/admin/finanzas')
    revalidatePath('/admin/crm/alumnos')
    return { success: true }
}

export async function recordManualPayment(input: {
    child_id?: string | null
    amount: number
    type: string
    method: string
    description: string
    date: string
}) {
    const parsed = ManualPaymentSchema.safeParse(input)
    if (!parsed.success) return { success: false, error: 'Revisa la fecha, el importe y la descripción' }

    const { supabase } = await requireFinanceAccess()
    const methodSetting = ['cash', 'efectivo'].includes(parsed.data.method)
        ? 'payment_cash_enabled'
        : ['transfer', 'transferencia'].includes(parsed.data.method)
            ? 'payment_transfer_enabled'
            : 'payment_card_enabled'
    const { data: paymentSetting } = await supabase
        .from('academy_settings')
        .select('value')
        .eq('key', methodSetting)
        .maybeSingle()
    if (paymentSetting?.value === 'false' || (methodSetting === 'payment_card_enabled' && paymentSetting?.value !== 'true')) {
        return { success: false, error: 'Este método de pago está desactivado en Ajustes' }
    }
    const paidAt = `${parsed.data.date}T12:00:00.000Z`
    const { error } = await supabase.from('payments').insert({
        type: parsed.data.type,
        amount: parsed.data.amount,
        status: 'paid',
        method: parsed.data.method,
        paid_at: paidAt,
        due_date: parsed.data.date,
        child_id: parsed.data.child_id || null,
        description: parsed.data.description,
        ref_id: null,
    })

    if (error) {
        console.error('Error recording manual payment:', error)
        return { success: false, error: 'No se pudo registrar el ingreso' }
    }

    revalidatePath('/admin/finanzas')
    return { success: true }
}

export async function createExpense(input: { concept: string; amount: number; category: string; date: string; notes?: string }) {
    const parsed = ExpenseSchema.safeParse(input)
    if (!parsed.success) return { success: false, error: 'Revisa los datos del gasto' }

    const { supabase } = await requireFinanceAccess()
    const { error } = await supabase.from('expenses').insert(parsed.data)
    if (error) return { success: false, error: 'No se pudo registrar el gasto' }

    revalidatePath('/admin/finanzas')
    return { success: true }
}

export async function updateExpense(id: string, input: { concept: string; amount: number; category: string; date: string; notes?: string }) {
    const parsedId = z.string().uuid().safeParse(id)
    const parsed = ExpenseSchema.safeParse(input)
    if (!parsedId.success || !parsed.success) return { success: false, error: 'Revisa los datos del gasto' }

    const { supabase } = await requireFinanceAccess()
    const { error } = await supabase.from('expenses').update({ ...parsed.data, updated_at: new Date().toISOString() }).eq('id', parsedId.data)
    if (error) return { success: false, error: 'No se pudo actualizar el gasto' }

    revalidatePath('/admin/finanzas')
    return { success: true }
}

export async function deleteExpense(id: string) {
    const parsedId = z.string().uuid().safeParse(id)
    if (!parsedId.success) return { success: false, error: 'Gasto no válido' }

    const { supabase } = await requireFinanceAccess()
    const now = new Date().toISOString()
    const { error } = await supabase.from('expenses').update({ deleted_at: now, updated_at: now }).eq('id', parsedId.data)
    if (error) return { success: false, error: 'No se pudo archivar el gasto' }

    revalidatePath('/admin/finanzas')
    return { success: true }
}
