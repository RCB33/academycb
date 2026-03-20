'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

const TeamSchema = z.object({
    name: z.string().min(1, "El nombre es obligatorio"),
    category_id: z.string().uuid().optional().nullable(),
    coach_id: z.string().uuid().optional().nullable(),
    schedule: z.string().optional().nullable(),
    max_players: z.number().int().min(1).default(16),
    status: z.enum(['active', 'inactive']).default('active'),
    color: z.string().default('#3b82f6'),
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
