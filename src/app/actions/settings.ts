'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { requireAdmin, requireFinanceAccess } from '@/lib/auth'

const optionalText = (max = 500) => z.string().trim().max(max)
const optionalUrl = z.string().trim().max(500).refine(
    (value) => !value || /^https?:\/\//i.test(value),
    'La URL debe comenzar por http:// o https://',
)
const optionalEmail = z.string().trim().max(160).refine(
    (value) => !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
    'El correo electrónico no es válido',
)
const optionalDate = z.string().trim().refine(
    (value) => !value || /^\d{4}-\d{2}-\d{2}$/.test(value),
    'La fecha no es válida',
)

const SettingsUpdateSchema = z.object({
    academy_name: optionalText(120),
    academy_legal_name: optionalText(160),
    academy_cif: optionalText(30),
    academy_phone: optionalText(40),
    academy_email: optionalEmail,
    academy_address: optionalText(240),
    academy_whatsapp: optionalText(40),
    academy_website: optionalUrl,
    academy_instagram: optionalUrl,
    academy_facebook: optionalUrl,
    academy_youtube: optionalUrl,
    academy_logo_url: optionalUrl,
    privacy_contact_email: optionalEmail,
    tournaments_url: optionalUrl,
    current_season: z.string().trim().max(20).refine(
        (value) => !value || /^\d{4}\s*\/\s*\d{4}$/.test(value),
        'La temporada debe tener el formato 2026/2027',
    ),
    season_start: optionalDate,
    season_end: optionalDate,
    default_location: optionalText(200),
    support_hours: optionalText(200),
    timezone: z.enum(['Europe/Madrid']),
    locale: z.enum(['es-ES', 'ca-ES']),
    currency: z.enum(['EUR']),
    payment_cash_enabled: z.enum(['true', 'false']),
    payment_transfer_enabled: z.enum(['true', 'false']),
    payment_card_enabled: z.enum(['true', 'false']),
    default_payment_method: z.enum(['efectivo', 'transferencia', 'tarjeta']),
    bank_account_holder: optionalText(160),
    bank_iban: z.string().trim().max(42).refine(
        (value) => !value || /^[A-Z]{2}\d{2}[A-Z0-9]{10,30}$/.test(value.replace(/\s/g, '').toUpperCase()),
        'El IBAN no tiene un formato válido',
    ),
    bank_bic: z.string().trim().max(20).refine(
        (value) => !value || /^[A-Z0-9]{8}([A-Z0-9]{3})?$/.test(value.replace(/\s/g, '').toUpperCase()),
        'El BIC/SWIFT no tiene un formato válido',
    ),
    bank_transfer_instructions: optionalText(600),
    billing_due_day: z.string().trim().refine((value) => {
        const day = Number(value)
        return Number.isInteger(day) && day >= 1 && day <= 28
    }, 'El día de vencimiento debe estar entre 1 y 28'),
    billing_grace_days: z.string().trim().refine((value) => {
        const days = Number(value)
        return Number.isInteger(days) && days >= 0 && days <= 60
    }, 'Los días de cortesía deben estar entre 0 y 60'),
    receipt_prefix: z.string().trim().min(1).max(12).regex(/^[A-Z0-9-]+$/i, 'Prefijo no válido'),
    invoice_tax_rate: z.string().trim().refine((value) => {
        const tax = Number(value)
        return Number.isFinite(tax) && tax >= 0 && tax <= 100
    }, 'El impuesto debe estar entre 0 y 100'),
    invoice_notes: optionalText(600),
    data_retention_months: z.string().trim().refine((value) => {
        const months = Number(value)
        return Number.isInteger(months) && months >= 12 && months <= 120
    }, 'La conservación debe estar entre 12 y 120 meses'),
}).partial().strict().superRefine((value, context) => {
    const methodKeysPresent = value.payment_cash_enabled !== undefined
        || value.payment_transfer_enabled !== undefined
        || value.payment_card_enabled !== undefined
    if (!methodKeysPresent) return
    if (value.payment_card_enabled === 'true') {
        context.addIssue({ code: 'custom', message: 'No se puede activar tarjeta hasta completar la integración real con Stripe', path: ['payment_card_enabled'] })
    }
    const enabled = {
        efectivo: value.payment_cash_enabled === 'true',
        transferencia: value.payment_transfer_enabled === 'true',
        tarjeta: value.payment_card_enabled === 'true',
    }
    if (!Object.values(enabled).some(Boolean)) {
        context.addIssue({ code: 'custom', message: 'Debe quedar al menos un método de pago activo', path: ['payment_cash_enabled'] })
    }
    if (value.default_payment_method && !enabled[value.default_payment_method]) {
        context.addIssue({ code: 'custom', message: 'El método predeterminado debe estar activo', path: ['default_payment_method'] })
    }
})

const PUBLIC_SETTINGS = new Set([
    'academy_name', 'academy_legal_name', 'academy_cif', 'academy_phone', 'academy_email',
    'academy_address', 'academy_whatsapp', 'academy_website', 'academy_instagram',
    'academy_facebook', 'academy_youtube', 'academy_logo_url', 'privacy_contact_email',
    'tournaments_url', 'current_season', 'default_location', 'support_hours',
    'timezone', 'locale', 'currency',
])

const PlanSchema = z.object({
    name: z.string().trim().min(2, 'El nombre es obligatorio').max(100),
    description: z.string().trim().max(500).default(''),
    duration_months: z.number().int().min(1).max(60),
    price: z.number().finite().min(0).max(1_000_000),
    enrollment_fee: z.number().finite().min(0).max(1_000_000).default(0),
    frequency: z.enum(['mensual', 'trimestral', 'anual']),
    is_active: z.boolean().default(true),
    sort_order: z.number().int().min(0).max(999).default(0),
})

const CategorySchema = z.object({
    name: z.string().trim().min(2, 'El nombre es obligatorio').max(80),
    short_name: z.string().trim().max(20).optional().default(''),
    birth_year_from: z.number().int().min(1990).max(2100).nullable().optional(),
    birth_year_to: z.number().int().min(1990).max(2100).nullable().optional(),
    is_active: z.boolean().default(true),
    sort_order: z.number().int().min(0).max(999).default(0),
}).refine(
    (value) => !value.birth_year_from || !value.birth_year_to || value.birth_year_from <= value.birth_year_to,
    { message: 'El rango de años de nacimiento no es válido', path: ['birth_year_to'] },
)

export type MembershipPlan = {
    id: string
    name: string
    description: string
    duration_months: number
    price: number
    enrollment_fee: number
    frequency: 'mensual' | 'trimestral' | 'anual'
    is_active: boolean
    sort_order: number
    created_at: string
    updated_at: string
    membership_count?: number
    active_membership_count?: number
}

export type AcademyCategory = {
    id: string
    name: string
    short_name: string | null
    birth_year_from: number | null
    birth_year_to: number | null
    is_active: boolean
    sort_order: number
    child_count: number
    team_count: number
}

export type PaymentMethodOption = {
    value: 'efectivo' | 'transferencia' | 'tarjeta'
    label: string
    enabled: boolean
}

export type PaymentConfiguration = {
    methods: PaymentMethodOption[]
    defaultMethod: 'efectivo' | 'transferencia' | 'tarjeta'
    dueDay: number
    graceDays: number
    receiptPrefix: string
    taxRate: number
}

export type SettingsOverview = {
    completion: number
    missingRequired: string[]
    activePlans: number
    archivedPlans: number
    activeCategories: number
    uncategorizedChildren: number
    uncategorizedTeams: number
    whatsappConfigured: boolean
    stripeConfigured: boolean
    audit: Array<{
        id: string
        entity_type: 'setting' | 'plan' | 'category'
        entity_id: string
        action: 'create' | 'update' | 'delete'
        created_at: string
    }>
}

function revalidateSettings() {
    revalidatePath('/admin/ajustes')
    revalidatePath('/admin/academia')
    revalidatePath('/admin/finanzas')
    revalidatePath('/', 'layout')
}

function errorMessage(error: unknown, fallback: string) {
    if (error instanceof z.ZodError) return error.issues[0]?.message || fallback
    if (error instanceof Error) return error.message
    return fallback
}

export async function getSettings(): Promise<Record<string, string>> {
    const { supabase } = await requireAdmin()
    const { data, error } = await supabase
        .from('academy_settings')
        .select('key, value')
        .not('key', 'is', null)

    if (error) throw new Error('No se pudieron cargar los ajustes')
    return Object.fromEntries((data || []).map((row) => [row.key, row.value || '']))
}

export async function updateSettings(updates: Record<string, string>) {
    try {
        const { supabase, user } = await requireAdmin()
        const parsed = SettingsUpdateSchema.parse(updates)
        const rows = Object.entries(parsed).map(([key, value]) => ({
            key,
            value: key === 'bank_iban' || key === 'bank_bic'
                ? String(value).replace(/\s/g, '').toUpperCase()
                : String(value),
            is_public: PUBLIC_SETTINGS.has(key),
            updated_by: user.id,
            updated_at: new Date().toISOString(),
        }))

        if (rows.length === 0) return { success: false, error: 'No hay cambios para guardar' }
        const { error } = await supabase.from('academy_settings').upsert(rows, { onConflict: 'key' })
        if (error) throw error
        revalidateSettings()
        return { success: true }
    } catch (error) {
        return { success: false, error: errorMessage(error, 'No se pudieron guardar los ajustes') }
    }
}

export async function getPlans(includeInactive = false): Promise<MembershipPlan[]> {
    const { supabase } = await requireAdmin()
    let query = supabase
        .from('membership_plans')
        .select('id, name, description, duration_months, price, enrollment_fee, frequency, is_active, sort_order, created_at, updated_at')
        .order('sort_order')
        .order('name')
    if (!includeInactive) query = query.eq('is_active', true)

    const { data, error } = await query
    if (error) throw new Error('No se pudieron cargar los planes')
    const planIds = (data || []).map((plan) => plan.id)
    const { data: memberships } = planIds.length
        ? await supabase.from('academy_memberships').select('plan_id, status').in('plan_id', planIds)
        : { data: [] }

    return (data || []).map((plan) => ({
        ...plan,
        price: Number(plan.price || 0),
        enrollment_fee: Number(plan.enrollment_fee || 0),
        membership_count: (memberships || []).filter((item) => item.plan_id === plan.id).length,
        active_membership_count: (memberships || []).filter((item) => item.plan_id === plan.id && item.status === 'active').length,
    })) as MembershipPlan[]
}

export async function createPlan(input: z.input<typeof PlanSchema>) {
    try {
        const { supabase } = await requireAdmin()
        const data = PlanSchema.parse(input)
        const { error } = await supabase.from('membership_plans').insert(data)
        if (error) throw error
        revalidateSettings()
        return { success: true }
    } catch (error) {
        return { success: false, error: errorMessage(error, 'No se pudo crear el plan') }
    }
}

export async function updatePlan(id: string, input: z.input<typeof PlanSchema>) {
    try {
        const { supabase } = await requireAdmin()
        const planId = z.string().uuid().parse(id)
        const data = PlanSchema.parse(input)
        const { error } = await supabase.from('membership_plans').update(data).eq('id', planId)
        if (error) throw error
        revalidateSettings()
        return { success: true }
    } catch (error) {
        return { success: false, error: errorMessage(error, 'No se pudo actualizar el plan') }
    }
}

export async function setPlanActive(id: string, isActive: boolean) {
    try {
        const { supabase } = await requireAdmin()
        const planId = z.string().uuid().parse(id)
        const { error } = await supabase.from('membership_plans').update({ is_active: isActive }).eq('id', planId)
        if (error) throw error
        revalidateSettings()
        return { success: true }
    } catch (error) {
        return { success: false, error: errorMessage(error, 'No se pudo cambiar el estado del plan') }
    }
}

export async function deletePlan(id: string) {
    try {
        const { supabase } = await requireAdmin()
        const planId = z.string().uuid().parse(id)
        const { count, error: countError } = await supabase
            .from('academy_memberships').select('*', { count: 'exact', head: true }).eq('plan_id', planId)
        if (countError) throw countError
        if (count && count > 0) return { success: false, error: `No se puede eliminar: ${count} alumnos usan este plan. Archívalo.` }
        const { error } = await supabase.from('membership_plans').delete().eq('id', planId)
        if (error) throw error
        revalidateSettings()
        return { success: true }
    } catch (error) {
        return { success: false, error: errorMessage(error, 'No se pudo eliminar el plan') }
    }
}

export async function getCategories(includeInactive = true): Promise<AcademyCategory[]> {
    const { supabase } = await requireAdmin()
    let query = supabase
        .from('categories')
        .select('id, name, short_name, birth_year_from, birth_year_to, is_active, sort_order')
        .order('sort_order')
        .order('name')
    if (!includeInactive) query = query.eq('is_active', true)
    const { data, error } = await query
    if (error) throw new Error('No se pudieron cargar las categorías')

    const ids = (data || []).map((category) => category.id)
    const [{ data: children }, { data: teams }] = ids.length
        ? await Promise.all([
            supabase.from('children').select('category_id').in('category_id', ids),
            supabase.from('teams').select('category_id').in('category_id', ids),
        ])
        : [{ data: [] }, { data: [] }]

    return (data || []).map((category) => ({
        ...category,
        child_count: (children || []).filter((item) => item.category_id === category.id).length,
        team_count: (teams || []).filter((item) => item.category_id === category.id).length,
    })) as AcademyCategory[]
}

export async function createCategory(input: z.input<typeof CategorySchema>) {
    try {
        const { supabase } = await requireAdmin()
        const data = CategorySchema.parse(input)
        const { error } = await supabase.from('categories').insert({ ...data, short_name: data.short_name || null })
        if (error) throw error
        revalidateSettings()
        return { success: true }
    } catch (error) {
        return { success: false, error: errorMessage(error, 'No se pudo crear la categoría') }
    }
}

export async function updateCategory(id: string, input: z.input<typeof CategorySchema>) {
    try {
        const { supabase } = await requireAdmin()
        const categoryId = z.string().uuid().parse(id)
        const data = CategorySchema.parse(input)
        const { error } = await supabase.from('categories').update({ ...data, short_name: data.short_name || null }).eq('id', categoryId)
        if (error) throw error
        revalidateSettings()
        return { success: true }
    } catch (error) {
        return { success: false, error: errorMessage(error, 'No se pudo actualizar la categoría') }
    }
}

export async function setCategoryActive(id: string, isActive: boolean) {
    try {
        const { supabase } = await requireAdmin()
        const categoryId = z.string().uuid().parse(id)
        const { error } = await supabase.from('categories').update({ is_active: isActive }).eq('id', categoryId)
        if (error) throw error
        revalidateSettings()
        return { success: true }
    } catch (error) {
        return { success: false, error: errorMessage(error, 'No se pudo cambiar el estado de la categoría') }
    }
}

export async function deleteCategory(id: string) {
    try {
        const { supabase } = await requireAdmin()
        const categoryId = z.string().uuid().parse(id)
        const [{ count: childCount, error: childError }, { count: teamCount, error: teamError }] = await Promise.all([
            supabase.from('children').select('*', { count: 'exact', head: true }).eq('category_id', categoryId),
            supabase.from('teams').select('*', { count: 'exact', head: true }).eq('category_id', categoryId),
        ])
        if (childError || teamError) throw childError || teamError
        if ((childCount || 0) + (teamCount || 0) > 0) {
            return {
                success: false,
                error: `No se puede eliminar: está vinculada a ${childCount || 0} alumnos y ${teamCount || 0} equipos. Archívala.`,
            }
        }
        const { error } = await supabase.from('categories').delete().eq('id', categoryId)
        if (error) throw error
        revalidateSettings()
        return { success: true }
    } catch (error) {
        return { success: false, error: errorMessage(error, 'No se pudo eliminar la categoría') }
    }
}

export async function getPaymentConfiguration(): Promise<PaymentConfiguration> {
    const { supabase } = await requireFinanceAccess()
    const { data, error } = await supabase
        .from('academy_settings')
        .select('key, value')
        .in('key', [
            'payment_cash_enabled', 'payment_transfer_enabled', 'payment_card_enabled',
            'default_payment_method', 'billing_due_day', 'billing_grace_days',
            'receipt_prefix', 'invoice_tax_rate',
        ])
    if (error) throw new Error('No se pudo cargar la configuración de cobros')
    const values = Object.fromEntries((data || []).map((row) => [row.key, row.value || '']))
    const methods: PaymentMethodOption[] = [
        { value: 'efectivo', label: '💵 Efectivo', enabled: values.payment_cash_enabled !== 'false' },
        { value: 'transferencia', label: '🏦 Transferencia', enabled: values.payment_transfer_enabled !== 'false' },
        { value: 'tarjeta', label: '💳 Tarjeta', enabled: values.payment_card_enabled === 'true' },
    ]
    const available = methods.filter((method) => method.enabled)
    const configuredDefault = values.default_payment_method as PaymentConfiguration['defaultMethod']
    const defaultMethod = available.some((method) => method.value === configuredDefault)
        ? configuredDefault
        : available[0]?.value || 'transferencia'
    return {
        methods,
        defaultMethod,
        dueDay: Number(values.billing_due_day || 5),
        graceDays: Number(values.billing_grace_days || 5),
        receiptPrefix: values.receipt_prefix || 'ACB',
        taxRate: Number(values.invoice_tax_rate || 0),
    }
}

export async function getSettingsOverview(settingsInput?: Record<string, string>): Promise<SettingsOverview> {
    const { supabase } = await requireAdmin()
    const settings = settingsInput || await getSettings()
    const required: Array<[string, string]> = [
        ['academy_name', 'Nombre comercial'], ['academy_legal_name', 'Razón social'],
        ['academy_cif', 'CIF/NIF'], ['academy_email', 'Email'], ['academy_phone', 'Teléfono'],
        ['academy_address', 'Dirección'], ['current_season', 'Temporada'],
        ['default_location', 'Sede principal'], ['privacy_contact_email', 'Contacto de privacidad'],
    ]
    const missingRequired = required.filter(([key]) => !settings[key]?.trim()).map(([, label]) => label)

    const [plans, categories, uncategorizedChildren, uncategorizedTeams, whatsapp, audit] = await Promise.all([
        getPlans(true),
        getCategories(true),
        supabase.from('children').select('*', { count: 'exact', head: true }).is('category_id', null),
        supabase.from('teams').select('*', { count: 'exact', head: true }).is('category_id', null),
        supabase.from('academy_settings')
            .select('greenapi_id_instance, greenapi_api_token_instance')
            .eq('key', 'whatsapp_integration').maybeSingle(),
        supabase.from('settings_audit_log')
            .select('id, entity_type, entity_id, action, created_at')
            .order('created_at', { ascending: false }).limit(12),
    ])

    return {
        completion: Math.round(((required.length - missingRequired.length) / required.length) * 100),
        missingRequired,
        activePlans: plans.filter((plan) => plan.is_active).length,
        archivedPlans: plans.filter((plan) => !plan.is_active).length,
        activeCategories: categories.filter((category) => category.is_active).length,
        uncategorizedChildren: uncategorizedChildren.count || 0,
        uncategorizedTeams: uncategorizedTeams.count || 0,
        whatsappConfigured: Boolean(whatsapp.data?.greenapi_id_instance && whatsapp.data?.greenapi_api_token_instance),
        stripeConfigured: false,
        audit: (audit.data || []) as SettingsOverview['audit'],
    }
}
