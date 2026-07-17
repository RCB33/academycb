'use server'

import { requireAdmin } from '@/lib/auth'
import { getBillingIntervalMonths, normalizeBillingFrequency } from '@/lib/membership-billing'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

const createClient = async () => (await requireAdmin()).supabase

const TeamSchema = z.object({
    name: z.string().min(1, "El nombre es obligatorio"),
    category_id: z.string().uuid().optional().nullable(),
    coach_id: z.string().uuid().optional().nullable(),
    schedule: z.string().optional().nullable(),
    max_players: z.number().int().min(1).default(16),
    status: z.enum(['active', 'inactive']).default('active'),
    color: z.string().default('#3b82f6'),
})

const EnrollmentSchema = z.object({
    childId: z.string().uuid(),
    teamId: z.string().uuid(),
    planId: z.string().uuid(),
    paymentMethod: z.enum(['efectivo', 'transferencia', 'stripe']),
    periodPrice: z.number().finite().nonnegative(),
})

export async function getTeams() {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('teams')
        .select(`
            *,
            category:categories(id, name),
            coach:workers(id, full_name, avatar_url, color),
            players:children(id, full_name, birth_year)
        `)
        .order('created_at', { ascending: false })

    if (error) {
        console.error('Error fetching teams:', error)
        return []
    }
    return data
}

export async function getTeamById(id: string) {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('teams')
        .select(`
            *,
            category:categories(id, name),
            coach:workers(id, full_name, avatar_url, color),
            players:children(id, full_name, birth_year, category_id)
        `)
        .eq('id', id)
        .single()

    if (error) {
        console.error('Error fetching team:', error)
        return null
    }
    return data
}

export async function createTeam(formData: z.infer<typeof TeamSchema>) {
    const supabase = await createClient()
    const validated = TeamSchema.safeParse(formData)

    if (!validated.success) {
        console.error("Validation error:", validated.error)
        return { success: false, error: "Datos inválidos" }
    }

    const { data: newTeam, error } = await supabase
        .from('teams')
        .insert(validated.data)
        .select()
        .single()

    if (error) {
        console.error('Error creating team:', error)
        return { success: false, error: "Error al crear equipo" }
    }

    revalidatePath('/admin/academia')
    return { success: true, id: newTeam.id }
}

export async function updateTeam(id: string, formData: z.infer<typeof TeamSchema>) {
    const supabase = await createClient()
    const validated = TeamSchema.safeParse(formData)

    if (!validated.success) {
        return { success: false, error: "Datos inválidos" }
    }

    const { error } = await supabase
        .from('teams')
        .update(validated.data)
        .eq('id', id)

    if (error) {
        console.error('Error updating team:', error)
        return { success: false, error: "Error al actualizar equipo" }
    }

    revalidatePath('/admin/academia')
    return { success: true }
}

export async function deleteTeam(id: string) {
    const supabase = await createClient()

    // First unassign all children from this team
    await supabase
        .from('children')
        .update({ team_id: null })
        .eq('team_id', id)

    const { error } = await supabase
        .from('teams')
        .delete()
        .eq('id', id)

    if (error) {
        console.error('Error deleting team:', error)
        return { success: false, error: "Error al eliminar equipo" }
    }

    revalidatePath('/admin/academia')
    return { success: true }
}

export async function assignPlayerToTeam(childId: string, teamId: string | null) {
    const supabase = await createClient()

    const { error } = await supabase
        .from('children')
        .update({ team_id: teamId })
        .eq('id', childId)

    if (error) {
        console.error('Error assigning player:', error)
        return { success: false, error: "Error al asignar jugador" }
    }

    revalidatePath('/admin/academia')
    return { success: true }
}

export async function getUnassignedPlayers() {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('children')
        .select('id, full_name, birth_year, category:categories(name)')
        .is('team_id', null)
        .order('full_name')

    if (error) {
        console.error('Error fetching unassigned players:', error)
        return []
    }
    return data
}

export async function enrollPlayerWithPlan(data: {
    childId: string
    teamId: string
    planId: string
    paymentMethod: string // 'efectivo' | 'transferencia' | 'stripe'
    periodPrice: number
}) {
    const supabase = await createClient()
    const validated = EnrollmentSchema.safeParse(data)

    if (!validated.success) {
        return { success: false, error: "Los datos de inscripción no son válidos" }
    }

    const enrollment = validated.data

    // Read the plan before mutating the player so an invalid plan cannot leave
    // a half-completed team assignment.
    const { data: plan, error: planError } = await supabase
        .from('membership_plans')
        .select('name, duration_months, frequency')
        .eq('id', enrollment.planId)
        .single()

    if (planError || !plan) {
        console.error('Error fetching membership plan:', planError)
        return { success: false, error: "El plan seleccionado ya no existe" }
    }

    const { data: player, error: playerError } = await supabase
        .from('children')
        .select('team_id')
        .eq('id', enrollment.childId)
        .single()

    if (playerError || !player) {
        return { success: false, error: "No se encontró el alumno" }
    }

    // 1. Assign to team
    const { error: teamError } = await supabase
        .from('children')
        .update({ team_id: enrollment.teamId })
        .eq('id', enrollment.childId)

    if (teamError) {
        console.error('Error assigning player:', teamError)
        return { success: false, error: "Error al asignar jugador" }
    }

    const durationMonths = plan?.duration_months || 12
    const frequency = normalizeBillingFrequency(plan?.frequency, durationMonths, plan?.name)
    const billingIntervalMonths = getBillingIntervalMonths(frequency)

    // 3. Create membership
    const startDate = new Date()
    const endDate = new Date()
    endDate.setMonth(endDate.getMonth() + durationMonths)

    const { data: membership, error: memError } = await supabase
        .from('academy_memberships')
        .insert([{
            child_id: enrollment.childId,
            plan_id: enrollment.planId,
            start_date: startDate.toISOString().split('T')[0],
            end_date: endDate.toISOString().split('T')[0],
            status: 'active',
            payment_status: 'pending',
            payment_method: enrollment.paymentMethod,
            // Legacy database column: this stores the price of each billing period.
            monthly_price: enrollment.periodPrice,
        }])
        .select('id')
        .single()

    if (memError) {
        console.error('Error creating membership:', memError)
        await supabase.from('children').update({ team_id: player.team_id }).eq('id', enrollment.childId)
        return { success: false, error: "Error al crear la membresía" }
    }

    // 4. Generate one receipt per real billing period.
    if (membership) {
        const payments = []
        const paymentCount = Math.ceil(durationMonths / billingIntervalMonths)
        for (let i = 0; i < paymentCount; i++) {
            const paymentDate = new Date(startDate)
            paymentDate.setMonth(paymentDate.getMonth() + (i * billingIntervalMonths))
            payments.push({
                type: 'academy',
                ref_id: membership.id,
                child_id: enrollment.childId,
                amount: enrollment.periodPrice,
                status: 'pending',
                method: enrollment.paymentMethod,
                due_date: paymentDate.toISOString().split('T')[0],
                description: `Cuota ${frequency} - ${paymentDate.toLocaleDateString('es', { month: 'long', year: 'numeric' })}`
            })
        }
        const { error: paymentsError } = await supabase.from('payments').insert(payments)
        if (paymentsError) {
            console.error('Error creating payment schedule:', paymentsError)
            await supabase.from('academy_memberships').delete().eq('id', membership.id)
            await supabase.from('children').update({ team_id: player.team_id }).eq('id', enrollment.childId)
            return { success: false, error: "No se pudo crear el calendario de cobros" }
        }
    }

    revalidatePath('/admin/academia')
    revalidatePath('/admin/finanzas')
    return { success: true }
}
