'use server'

import { requireAdmin } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

const createClient = async () => (await requireAdmin()).supabase
const isSafeExternalUrl = (value?: string | null) => !value || /^https?:\/\//i.test(value)

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
    checklist: unknown
    created_at: string
    team_count?: number
    confirmed_count?: number
    player_count?: number
}

export type TournamentPlayer = {
    id: string
    tournament_id: string
    child_id: string
    team_id: string | null
    status: 'selected' | 'confirmed' | 'cancelled'
    notes: string | null
    created_at: string
    child?: { id: string, full_name: string, birth_year: number | null, category?: { name: string } | null }
    team?: { id: string, name: string } | null
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
        .select(`*, tournament_teams(id, status), tournament_players(id, status)`)
        .order('start_date', { ascending: false })

    if (error) { console.error("Error fetching tournaments:", error); return [] }

    type TournamentSummaryRow = Tournament & {
        tournament_teams?: Array<{ id: string; status: string }>
        tournament_players?: Array<{ id: string; status: string }>
    }
    return ((data || []) as unknown as TournamentSummaryRow[]).map(({ tournament_teams = [], tournament_players = [], ...tournament }) => ({
        ...tournament,
        team_count: tournament_teams.filter((team) => team.status !== 'cancelled').length,
        confirmed_count: tournament_teams.filter((team) => team.status === 'confirmed').length,
        player_count: tournament_players.filter((player) => player.status !== 'cancelled').length,
    }))
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
    if (!isSafeExternalUrl(data.external_url)) return { success: false, error: 'La URL externa no es válida' }
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
    revalidatePath('/admin/calendario')
    revalidatePath('/portal/calendario')
    return { success: true }
}

export async function updateTournament(id: string, data: Partial<Tournament>) {
    const supabase = await createClient()
    if (!isSafeExternalUrl(data.external_url)) return { success: false, error: 'La URL externa no es válida' }
    const { error } = await supabase.from('tournaments_internal').update(data).eq('id', id)
    if (error) { console.error("Error updating tournament:", error); return { success: false, error: "Error al actualizar" } }
    revalidatePath('/admin/torneos')
    revalidatePath('/admin/calendario')
    revalidatePath('/portal/calendario')
    return { success: true }
}

export async function deleteTournament(id: string) {
    const supabase = await createClient()
    const [{ count: teamCount }, { count: playerCount }] = await Promise.all([
        supabase.from('tournament_teams').select('*', { count: 'exact', head: true }).eq('tournament_id', id),
        supabase.from('tournament_players').select('*', { count: 'exact', head: true }).eq('tournament_id', id),
    ])
    if (teamCount && teamCount > 0) return { success: false, error: `Tiene ${teamCount} equipos inscritos. Elimínalos primero.` }
    if (playerCount && playerCount > 0) return { success: false, error: `Tiene ${playerCount} jugadores convocados. Retíralos primero.` }
    const { error } = await supabase.from('tournaments_internal').delete().eq('id', id)
    if (error) { console.error("Error deleting tournament:", error); return { success: false, error: "Error al eliminar" } }
    revalidatePath('/admin/torneos')
    revalidatePath('/admin/calendario')
    revalidatePath('/portal/calendario')
    return { success: true }
}

// ─── TOURNAMENT PLAYERS ───

export async function getTournamentPlayers(tournamentId: string) {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('tournament_players')
        .select('*, child:children(id, full_name, birth_year, category:categories(name)), team:teams(id, name)')
        .eq('tournament_id', tournamentId)
        .order('created_at', { ascending: false })

    if (error) { console.error('Error fetching tournament players:', error); return [] }
    return (data || []) as TournamentPlayer[]
}

export async function getAvailableChildrenForTournament(tournamentId: string) {
    const supabase = await createClient()
    const [{ data: children }, { data: existing }] = await Promise.all([
        supabase.from('children').select('id, full_name, birth_year, category:categories(name)').order('full_name'),
        supabase.from('tournament_players').select('child_id').eq('tournament_id', tournamentId),
    ])
    const used = new Set((existing || []).map((item) => item.child_id))
    return (children || []).filter((child) => !used.has(child.id))
}

export async function registerTournamentPlayer(data: {
    tournament_id: string
    child_id: string
    team_id?: string | null
    notes?: string | null
}) {
    const supabase = await createClient()
    const { error } = await supabase.from('tournament_players').insert({
        tournament_id: data.tournament_id,
        child_id: data.child_id,
        team_id: data.team_id || null,
        notes: data.notes || null,
        status: 'selected',
    })
    if (error) {
        if (error.code === '23505') return { success: false, error: 'El jugador ya está convocado' }
        console.error('Error registering tournament player:', error)
        return { success: false, error: 'Error al convocar al jugador' }
    }
    revalidatePath('/admin/torneos')
    revalidatePath('/admin/crm/alumnos')
    return { success: true }
}

export async function updateTournamentPlayerStatus(id: string, status: TournamentPlayer['status']) {
    const supabase = await createClient()
    const { error } = await supabase.from('tournament_players').update({ status }).eq('id', id)
    if (error) return { success: false, error: 'Error al actualizar el estado' }
    revalidatePath('/admin/torneos')
    revalidatePath('/admin/crm/alumnos')
    return { success: true }
}

export async function removeTournamentPlayer(id: string) {
    const supabase = await createClient()
    const { error } = await supabase.from('tournament_players').delete().eq('id', id)
    if (error) return { success: false, error: 'Error al retirar al jugador' }
    revalidatePath('/admin/torneos')
    revalidatePath('/admin/crm/alumnos')
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
