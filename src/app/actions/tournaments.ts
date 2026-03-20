'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export type Tournament = {
    id: string
    title: string
    start_date: string | null
    end_date: string | null
    location: string | null
    price: number
    capacity: number
    status: 'draft' | 'open' | 'closed'
    type: 'propio' | 'externo'
    external_url: string | null
    notes: string | null
    checklist: any
    created_at: string
    team_count?: number
    confirmed_count?: number
}

export type TournamentTeam = {
    id: string
    tournament_id: string
    team_name: string
    contact_phone: string | null
    contact_email: string | null
    is_local: boolean
    team_id: string | null
    status: 'registered' | 'confirmed' | 'cancelled'
    notes: string | null
    created_at: string
}

// ─── TOURNAMENTS CRUD ───

export async function getTournaments() {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('tournaments_internal')
        .select(`*, tournament_teams(id, status)`)
        .order('start_date', { ascending: false })

    if (error) { console.error("Error fetching tournaments:", error); return [] }

    return (data || []).map((t: any) => ({
        ...t,
        team_count: t.tournament_teams?.filter((tt: any) => tt.status !== 'cancelled').length || 0,
        confirmed_count: t.tournament_teams?.filter((tt: any) => tt.status === 'confirmed').length || 0,
        tournament_teams: undefined
    })) as Tournament[]
}

export async function createTournament(data: {
    title: string
    start_date?: string | null
    end_date?: string | null
    location?: string | null
    price?: number
    capacity?: number
    status?: string
    type?: string
    external_url?: string | null
    notes?: string | null
}) {
    const supabase = await createClient()
    const { error } = await supabase.from('tournaments_internal').insert([{
        title: data.title,
        start_date: data.start_date || null,
        end_date: data.end_date || null,
        location: data.location || null,
        price: data.price || 0,
        capacity: data.capacity || 20,
        status: data.status || 'draft',
        type: data.type || 'propio',
        external_url: data.external_url || null,
        notes: data.notes || null,
    }])
    if (error) { console.error("Error creating tournament:", error); return { success: false, error: "Error al crear el torneo" } }
    revalidatePath('/admin/torneos')
    return { success: true }
}

export async function updateTournament(id: string, data: Partial<Tournament>) {
    const supabase = await createClient()
    const { error } = await supabase.from('tournaments_internal').update(data).eq('id', id)
    if (error) { console.error("Error updating tournament:", error); return { success: false, error: "Error al actualizar" } }
    revalidatePath('/admin/torneos')
    return { success: true }
}

export async function deleteTournament(id: string) {
    const supabase = await createClient()
    const { count } = await supabase.from('tournament_teams').select('*', { count: 'exact', head: true }).eq('tournament_id', id)
    if (count && count > 0) return { success: false, error: `Tiene ${count} equipos inscritos. Elimínalos primero.` }
    const { error } = await supabase.from('tournaments_internal').delete().eq('id', id)
    if (error) { console.error("Error deleting tournament:", error); return { success: false, error: "Error al eliminar" } }
    revalidatePath('/admin/torneos')
    return { success: true }
}

// ─── TOURNAMENT TEAMS ───

export async function getTournamentTeams(tournamentId: string) {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('tournament_teams')
        .select('*')
        .eq('tournament_id', tournamentId)
        .order('created_at', { ascending: false })

    if (error) { console.error("Error fetching teams:", error); return [] }
    return (data || []) as TournamentTeam[]
}

export async function registerTeam(data: {
    tournament_id: string
    team_name: string
    contact_phone?: string | null
    contact_email?: string | null
    is_local?: boolean
    team_id?: string | null
    notes?: string | null
}) {
    const supabase = await createClient()

    // Check capacity
    const { count } = await supabase
        .from('tournament_teams')
        .select('*', { count: 'exact', head: true })
        .eq('tournament_id', data.tournament_id)
        .neq('status', 'cancelled')

    const { data: tournament } = await supabase
        .from('tournaments_internal')
        .select('capacity')
        .eq('id', data.tournament_id)
        .single()

    if (tournament && count !== null && count >= tournament.capacity) {
        return { success: false, error: "El torneo está lleno" }
    }

    const { error } = await supabase.from('tournament_teams').insert([{
        tournament_id: data.tournament_id,
        team_name: data.team_name,
        contact_phone: data.contact_phone || null,
        contact_email: data.contact_email || null,
        is_local: data.is_local || false,
        team_id: data.team_id || null,
        notes: data.notes || null,
        status: 'registered',
    }])
    if (error) { console.error("Error registering team:", error); return { success: false, error: "Error al inscribir equipo" } }
    revalidatePath('/admin/torneos')
    return { success: true }
}

export async function updateTeamStatus(id: string, status: string) {
    const supabase = await createClient()
    const { error } = await supabase.from('tournament_teams').update({ status }).eq('id', id)
    if (error) return { success: false, error: "Error al actualizar" }
    revalidatePath('/admin/torneos')
    return { success: true }
}

export async function removeTeam(id: string) {
    const supabase = await createClient()
    const { error } = await supabase.from('tournament_teams').delete().eq('id', id)
    if (error) return { success: false, error: "Error al eliminar equipo" }
    revalidatePath('/admin/torneos')
    return { success: true }
}

// ─── HELPERS ───

export async function getLocalTeams() {
    const supabase = await createClient()
    const { data } = await supabase
        .from('teams')
        .select('id, name, category:categories(name)')
        .eq('status', 'active')
        .order('name')
    return data || []
}
