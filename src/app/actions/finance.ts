'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import type { SupabaseClient } from '@supabase/supabase-js'
import { requireAdmin, requireFinanceAccess } from '@/lib/auth'
import { receiptBalance, type ReceiptAllocation } from '@/lib/receipt-balance'

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
    independent_income: z.boolean().default(false),
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
    manualManageable?: boolean
    childName?: string
    allocationPaymentId?: string
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
    paidAmount: number
    remainingAmount: number
    hasAllocations: boolean
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
    stripe_payment_intent_id?: string | null
    stripe_invoice_id?: string | null
    manual_receipt_allocations?: ReceiptAllocation[]
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
    const { supabase, role } = await requireFinanceAccess()
    const range = getMonthRange(monthInput)

    const [paymentsResult, membershipsResult, campusResult, tournamentResult, ordersResult, expensesResult, studentsResult, graceResult] = await Promise.all([
        supabase.from('payments').select('id, type, ref_id, child_id, amount, status, method, paid_at, due_date, description, created_at, stripe_payment_intent_id, stripe_invoice_id, child:children(full_name), manual_receipt_allocations(id,batch_id,amount,paid_date,method,voided_at)'),
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
        const balance = receiptBalance(payment)
        const financialDate = getPaymentDate(payment)
        const normalizedStatus = getPaymentStatus(payment, graceDays)
        const inPeriod = isInRange(financialDate, range.startMs, range.nextMs)

        for (const allocation of payment.manual_receipt_allocations || []) {
            if (allocation.voided_at || !isInRange(allocation.paid_date, range.startMs, range.nextMs)) continue
            const collected = numberValue(allocation.amount)
            totalRevenue += collected
            sourceTotals[paymentSource(payment.type)] += collected
            transactions.push({ id: allocation.id!, type: transactionType(payment.type), concept: `Abono · ${payment.description || paymentSource(payment.type)}`, amount: collected, status: 'paid', date: allocation.paid_date, method: allocation.method, childName: payment.child?.full_name, allocationPaymentId: payment.id })
        }
        if (!balance.hasAllocations && payment.status === 'paid' && isInRange(payment.paid_at || financialDate, range.startMs, range.nextMs)) {
            totalRevenue += amount
            sourceTotals[paymentSource(payment.type)] += amount
        } else if (payment.status === 'pending' && inPeriod) {
            pendingPayments += balance.remaining
        } else if (payment.status === 'failed' && inPeriod) {
            pendingPayments += balance.remaining
        }

        if (normalizedStatus === 'overdue') {
            overduePayments += balance.remaining
            overdueCount += 1
        }

        if (inPeriod && !(balance.hasAllocations && payment.status === 'paid')) {
            const child = payment.child
            transactions.push({
                id: payment.id,
                type: transactionType(payment.type),
                concept: payment.description || `${child?.full_name || 'Ingreso'} · ${paymentSource(payment.type)}`,
                amount: balance.hasAllocations ? balance.remaining : amount,
                status: normalizedStatus,
                date: financialDate,
                method: payment.method,
                paymentId: payment.id,
                childName: child?.full_name,
                allocationPaymentId: balance.hasAllocations ? payment.id : undefined,
                manualManageable: !balance.hasAllocations && role === 'admin' && !payment.ref_id && !payment.stripe_payment_intent_id && !payment.stripe_invoice_id && ['cash', 'efectivo', 'transfer', 'transferencia'].includes(payment.method || ''),
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
        .select('id, child_id, payment_method, status, child:children(id, full_name, category:categories(name)), plan:membership_plans(name)'),
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
        .select('id, ref_id, amount, status, method, paid_at, due_date, description, created_at, manual_receipt_allocations(amount,paid_date,method,voided_at)')
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
            const balance = receiptBalance(payment)
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
                paidAmount: balance.paid,
                remainingAmount: balance.remaining,
                hasAllocations: balance.hasAllocations,
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
    const outstanding = receipts.filter(receipt => !['cancelled', 'refunded'].includes(receipt.status))
    const paymentStatus = outstanding.length > 0 && outstanding.every((receipt) => receipt.status === 'paid')
        ? 'paid'
        : outstanding.some((receipt) => ['pending', 'failed'].includes(receipt.status) && receipt.due_date && receipt.due_date < cutoff)
            ? 'overdue'
            : 'pending'

    await supabase.from('academy_memberships').update({ payment_status: paymentStatus }).eq('id', membershipId)
}

export async function setPaymentStatus(paymentId: string, statusInput: 'paid' | 'pending') {
    const parsedId = z.string().uuid().safeParse(paymentId)
    const parsedStatus = PaymentStatusSchema.safeParse(statusInput)
    if (!parsedId.success || !parsedStatus.success) return { success: false, error: 'Cobro no válido' }
    if (statusInput === 'paid') return { success: false, error: 'Usa Registrar cobro para indicar la fecha y el método de pago' }

    const { supabase } = await requireFinanceAccess()
    const { data: payment, error: readError } = await supabase
        .from('payments')
        .select('id, type, ref_id, status, method, stripe_payment_intent_id, stripe_invoice_id, updated_at')
        .eq('id', parsedId.data)
        .single()

    if (readError || !payment) return { success: false, error: 'No se encontró el cobro' }
    if (['cancelled', 'refunded'].includes(payment.status) || payment.method === 'stripe' || payment.stripe_payment_intent_id || payment.stripe_invoice_id) {
        return { success: false, error: 'No se puede reabrir un cobro anulado, reembolsado o gestionado por Stripe' }
    }

    const { data: changed, error } = await supabase
        .from('payments')
        .update({
            status: parsedStatus.data,
            paid_at: parsedStatus.data === 'paid' ? new Date().toISOString() : null,
            updated_at: new Date().toISOString(),
        })
        .eq('id', parsedId.data)
        .eq('updated_at', payment.updated_at)
        .eq('status', 'paid')
        .select('id')

    if (error || !changed?.length) return { success: false, error: 'No se pudo actualizar: recarga los datos del cobro' }
    if (payment.type === 'academy' && payment.ref_id) await syncAcademyMembership(supabase, payment.ref_id)

    revalidatePath('/admin/finanzas')
    revalidatePath('/admin/crm/alumnos')
    return { success: true }
}

export async function getReceiptsToCollect() {
    const { supabase } = await requireFinanceAccess()
    const { data, error } = await supabase.from('payments')
        .select('id, child_id, description, type, amount, due_date, updated_at, status, child:children(full_name), manual_receipt_allocations(amount,paid_date,method,voided_at)')
        .in('status', ['pending', 'failed']).is('stripe_payment_intent_id', null).is('stripe_invoice_id', null)
        .order('due_date', { ascending: true })
    if (error) throw new Error('No se pudieron cargar los recibos')
    return (data || []).map(p => ({ ...p, ...receiptBalance(p), childName: (p.child as unknown as { full_name: string } | null)?.full_name || 'Sin jugador vinculado' }))
}

export async function collectExistingReceipt(input: { id: string; version: string; date: string; method: string }) {
    const { supabase } = await requireFinanceAccess()
    const parsed = z.object({ id: z.string().uuid(), version: z.string().datetime({ offset: true }), date: z.string().date(), method: z.enum(['cash', 'transfer']) }).safeParse(input)
    if (!parsed.success) return { success: false, error: 'Revisa el recibo, fecha y método' }
    const p = parsed.data
    const { data, error } = await supabase.from('payments').select('id').eq('id', p.id).maybeSingle()
    if (error || !data) return { success: false, error: 'Recibo no disponible' }
    return { success: false, error: 'Recarga Finanzas y utiliza el nuevo formulario de abonos y reparto.' }
}

export async function collectManualBatch(input: { requestId: string; lines: { id: string; version: string; amount: number }[]; total: number; date: string; method: string; note: string }) {
    const { supabase } = await requireFinanceAccess()
    const money = z.number().finite().positive().max(1_000_000).refine(n => Math.abs(n * 100 - Math.round(n * 100)) < 0.00001)
    const parsed = z.object({ requestId: z.string().uuid(), lines: z.array(z.object({ id: z.string().uuid(), version: z.string().datetime({ offset: true }), amount: money })).min(1).max(30), total: money, date: z.string().date(), method: z.enum(['cash', 'transfer']), note: z.string().trim().max(500) }).safeParse(input)
    if (!parsed.success) return { success: false, error: 'Revisa el reparto, fecha y método. Usa importes con un máximo de dos decimales.' }
    const p = parsed.data
    if (p.lines.reduce((n, line) => n + Math.round(line.amount * 100), 0) !== Math.round(p.total * 100)) return { success: false, error: 'El reparto debe sumar exactamente el importe recibido' }
    const { error } = await supabase.rpc('collect_manual_batch', { batch_input: p.requestId, lines_input: p.lines, total_input: p.total, date_input: p.date, method_input: p.method, note_input: p.note })
    if (error) return { success: false, error: error.code === 'P0001' ? error.message : 'No se pudo registrar el cobro. Revisa el estado antes de volver a intentarlo.' }
    revalidatePath('/admin/finanzas')
    revalidatePath('/admin/crm/alumnos')
    revalidatePath('/portal/pagos')
    return { success: true }
}

export async function getCollectionHistory(paymentId: string) {
    const { supabase, role } = await requireFinanceAccess()
    if (!z.string().uuid().safeParse(paymentId).success) throw new Error('Recibo inválido')
    const { data, error } = await supabase.from('manual_receipt_allocations').select('id,amount,paid_date,method,voided_at,batch_id,batch:manual_collection_batches(total,note,void_reason,voided_at)').eq('payment_id', paymentId).order('paid_date', { ascending: false })
    if (error) throw new Error('No se pudo cargar el historial')
    return { entries: data || [], canVoid: role === 'admin' }
}

export async function voidManualBatch(id: string, reason: string) {
    const { supabase } = await requireAdmin()
    if (!z.string().uuid().safeParse(id).success || reason.trim().length < 5 || reason.length > 500) return { success: false, error: 'Indica un motivo de entre 5 y 500 caracteres' }
    const { error } = await supabase.rpc('void_manual_batch', { batch_input: id, reason_input: reason })
    if (error) return { success: false, error: error.code === 'P0001' ? error.message : 'No se pudo anular el cobro' }
    revalidatePath('/admin/finanzas'); revalidatePath('/portal/pagos'); revalidatePath('/admin/crm/alumnos')
    return { success: true }
}

export async function reassignManualPayment(input: { id: string; version: string; childId: string; reason: string }) {
    const { supabase } = await requireAdmin()
    const parsed = z.object({ id: z.string().uuid(), version: z.string().datetime({ offset: true }), childId: z.string().uuid(), reason: z.string().trim().min(5).max(500) }).safeParse(input)
    if (!parsed.success) return { success: false, error: 'Selecciona un jugador y explica el motivo' }
    const p = parsed.data
    const { error } = await supabase.rpc('reassign_manual_payment', { payment_input: p.id, version_input: p.version, child_input: p.childId, reason_input: p.reason })
    if (error) return { success: false, error: error.code === 'P0001' ? error.message : 'No se pudo reasignar' }
    revalidatePath('/admin/finanzas'); revalidatePath('/portal/pagos'); revalidatePath('/admin/crm/alumnos')
    return { success: true }
}

export async function getManualPaymentDetails(id: string) {
    const { supabase } = await requireAdmin()
    if (!z.string().uuid().safeParse(id).success) throw new Error('Cobro no válido')
    const { data: payment, error } = await supabase.from('payments').select('id, amount, description, method, due_date, paid_at, updated_at, status, child_id').eq('id', id).single()
    if (error || !payment) throw new Error('No se pudo cargar el cobro')
    const { data: history, error: historyError } = await supabase.from('manual_payment_history').select('id, actor_id, changed_at, reason, before_value, after_value').eq('payment_id', id).order('changed_at', { ascending: false })
    if (historyError) throw new Error('No se pudo cargar el historial')
    const { data: students, error: studentError } = await supabase.from('children').select('id,full_name').order('full_name')
    if (studentError) throw new Error('No se pudo cargar jugadores')
    return { payment, history: history || [], students: students || [] }
}

export async function correctManualPayment(input: {
    id: string; version: string; action: 'edit' | 'cancel'; reason: string
    amount?: number; description?: string; date?: string; method?: string
}) {
    const { supabase } = await requireAdmin()
    const parsed = z.object({
        id: z.string().uuid(), version: z.string().datetime({ offset: true }), action: z.enum(['edit', 'cancel']),
        reason: z.string().trim().min(5).max(500), amount: z.number().finite().positive().max(1000000).optional(),
        description: z.string().trim().min(3).max(240).optional(), date: z.string().date().optional(),
        method: z.enum(['cash', 'efectivo', 'transfer', 'transferencia']).optional(),
    }).safeParse(input)
    if (!parsed.success) return { success: false, error: 'Revisa los datos y escribe el motivo (mínimo 5 caracteres)' }
    const p = parsed.data
    const { error } = await supabase.rpc('correct_manual_payment', {
        payment_input: p.id, version_input: p.version, action_input: p.action, reason_input: p.reason,
        amount_input: p.amount ?? null, description_input: p.description ?? null,
        date_input: p.date ?? null, method_input: p.method ?? null,
    })
    if (error) return { success: false, error: error.code === 'P0001' ? error.message : 'No se pudo guardar. Puede haber un cobro online en curso; cancélalo antes de corregir el recibo.' }
    revalidatePath('/admin/finanzas')
    revalidatePath('/portal/pagos')
    return { success: true }
}

export async function recordManualPayment(input: {
    child_id?: string | null
    amount: number
    type: string
    method: string
    description: string
    date: string
    independent_income?: boolean
}) {
    const parsed = ManualPaymentSchema.safeParse(input)
    if (!parsed.success) return { success: false, error: 'Revisa la fecha, el importe y la descripción' }

    const { supabase } = await requireFinanceAccess()
    if (!parsed.data.independent_income) return { success: false, error: 'Confirma que es un ingreso independiente. Para mensualidades usa Registrar cobro y selecciona el recibo.' }
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
