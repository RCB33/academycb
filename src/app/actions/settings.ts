'use server'

import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/auth'

// ─── ACADEMY SETTINGS ───

export async function getSettings() {
    const { supabase } = await requireAdmin()
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
    const { supabase } = await requireAdmin()
    const publicKeys = new Set([
        'academy_name', 'academy_cif', 'academy_phone', 'academy_email',
        'academy_address', 'academy_whatsapp', 'tournaments_url', 'current_season'
    ])

    for (const [key, value] of Object.entries(updates)) {
        if (!publicKeys.has(key)) continue
        const cleanValue = value.trim()
        if (cleanValue.length > 500) return { success: false, error: `El valor de ${key} es demasiado largo.` }
        if (key === 'academy_email' && cleanValue && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanValue)) {
            return { success: false, error: 'El email no es válido.' }
        }
        if (key === 'tournaments_url' && cleanValue && !/^https?:\/\//i.test(cleanValue)) {
            return { success: false, error: 'El portal de resultados debe usar una URL HTTP o HTTPS.' }
        }
        const { error } = await supabase
            .from('academy_settings')
            .upsert({ key, value: cleanValue, is_public: true, updated_at: new Date().toISOString() }, { onConflict: 'key' })
        if (error) return { success: false, error: 'No se pudieron guardar los ajustes.' }
    }

    revalidatePath('/admin/ajustes')
    revalidatePath('/', 'layout')
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
    const { supabase } = await requireAdmin()
    const { data } = await supabase
        .from('membership_plans')
        .select('*')
        .order('name')

    return (data || []) as MembershipPlan[]
}

export async function createPlan(data: { name: string; duration_months: number; price: number; frequency: string }) {
    const { supabase } = await requireAdmin()
    const { error } = await supabase.from('membership_plans').insert([data])

    if (error) {
        console.error("Error creating plan:", error)
        return { success: false, error: "Error al crear el plan" }
    }

    revalidatePath('/admin/ajustes')
    return { success: true }
}

export async function updatePlan(id: string, data: Partial<{ name: string; duration_months: number; price: number; frequency: string }>) {
    const { supabase } = await requireAdmin()
    const { error } = await supabase.from('membership_plans').update(data).eq('id', id)

    if (error) return { success: false, error: "Error al actualizar" }
    revalidatePath('/admin/ajustes')
    return { success: true }
}

export async function deletePlan(id: string) {
    const { supabase } = await requireAdmin()
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
    const { supabase } = await requireAdmin()
    const { data } = await supabase
        .from('categories')
        .select('id, name')
        .order('name')
    return data || []
}

export async function createCategory(name: string) {
    const { supabase } = await requireAdmin()
    const { error } = await supabase.from('categories').insert([{ name }])
    if (error) return { success: false, error: "Error al crear categoría" }
    revalidatePath('/admin/ajustes')
    return { success: true }
}

export async function deleteCategory(id: string) {
    const { supabase } = await requireAdmin()
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
