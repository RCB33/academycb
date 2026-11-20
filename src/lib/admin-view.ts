import 'server-only'
import { cache } from 'react'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export type ViewKind = 'parents' | 'coach'
export const VIEW_COOKIE = { parents: 'academy_view_family', coach: 'academy_view_coach' } as const
export type AdminView = { kind: ViewKind; selectedId: string; name: string; options: { id: string; full_name: string }[]; userId: string | null }
const emptyId = '00000000-0000-0000-0000-000000000000'

// A display context only: the authenticated session and its database role never change.
export const getAdminView = cache(async (kind: ViewKind): Promise<AdminView | null> => {
    const db = await createClient()
    const { data: { user } } = await db.auth.getUser()
    if (!user) return null
    const { data: profile } = await db.from('profiles').select('role').eq('id', user.id).maybeSingle()
    if (profile?.role !== 'admin') return null
    const { data: active } = await db.rpc('has_role', { allowed_roles: ['admin'] })
    if (active !== true) return null
    if (kind === 'coach') return {kind,selectedId:emptyId,name:'Equipo técnico',options:[],userId:null}
    const { data, error } = await db.from('guardians').select('id,full_name,user_id').not('user_id','is',null).order('full_name').limit(1000)
    if (error) throw Error('No se pudieron cargar las vistas disponibles.')
    const options = data || []
    const preferred = (await cookies()).get(VIEW_COOKIE[kind])?.value
    const selected = options.find(item => item.id === preferred) || options[0]
    return { kind, selectedId: selected?.id || emptyId, name: selected?.full_name || '', options: options.map(({id, full_name}) => ({id, full_name})), userId: selected?.user_id || null }
})

// Only read-only portal pages use the displayed identity. Actions keep using auth.getUser().
export const getPortalViewer = cache(async () => {
    const supabase = await createClient()
    const { data: { user: actualUser } } = await supabase.auth.getUser()
    const view = actualUser ? await getAdminView('parents') : null
    if (!view) return { supabase, user: actualUser, actualUser, view }
    const { data } = view.userId ? await createAdminClient().auth.admin.getUserById(view.userId) : { data: { user: null } }
    return { supabase, user: data.user || (actualUser ? { ...actualUser, id: emptyId, email: undefined, email_confirmed_at: undefined } : null), actualUser, view }
})

export const getFamilyViewScope = cache(async () => {
    const { supabase: db, user, view } = await getPortalViewer()
    if (!view || !user) return null
    const { data: links } = await db.from('child_guardians').select('child:children(id,team_id,category_id,archived_at,category:categories(name),team:teams(name))').eq('guardian_id', view.selectedId)
    const children = (links || []).flatMap(l => Array.isArray(l.child) ? l.child : [l.child]).filter(c => c && !c.archived_at)
    const ids = children.map(c => c.id), teams = children.map(c => c.team_id).filter(Boolean)
    const [groups, campuses, tournaments, tournamentTeams] = await Promise.all([
        ids.length ? db.from('academy_group_assignments').select('child_id,team_id,membership:academy_memberships(status,start_date,end_date)').in('child_id',ids) : Promise.resolve({data:[]}),
        ids.length ? db.from('campus_enrollments').select('campus_id').in('child_id',ids).neq('status','cancelled') : Promise.resolve({data:[]}),
        ids.length ? db.from('tournament_players').select('tournament_id').in('child_id',ids).neq('status','cancelled') : Promise.resolve({data:[]}),
        teams.length ? db.from('tournament_teams').select('tournament_id').in('team_id',teams).neq('status','cancelled') : Promise.resolve({data:[]}),
    ])
    return { children, groups: groups.data || [], campusIds: (campuses.data || []).map(c => c.campus_id), tournamentIds: [...(tournaments.data || []), ...(tournamentTeams.data || [])].map(t => t.tournament_id) }
})

export function familyViewEventVisible(event: { visibility?: string; status?: string; start_date: string; source_type: string; source_id?: string | null; team_id?: string | null; category_id?: string | null }, scope: NonNullable<Awaited<ReturnType<typeof getFamilyViewScope>>>) {
    if (event.visibility !== 'families' || event.status === 'cancelled') return false
    if (event.source_type === 'campus') return scope.campusIds.includes(event.source_id)
    if (event.source_type === 'tournament') return scope.tournamentIds.includes(event.source_id)
    if (!['team','manual'].includes(event.source_type)) return false
    const day = new Date(event.start_date).toLocaleDateString('en-CA',{timeZone:'Europe/Madrid'})
    return scope.children.some(child => {
        if (!event.team_id) return event.category_id === child.category_id || (event.source_type === 'manual' && !event.category_id)
        const assignments = scope.groups.filter(g => g.child_id === child.id && g.team_id === event.team_id)
        if (!assignments.length) return child.team_id === event.team_id
        return assignments.some(g => { const m = Array.isArray(g.membership) ? g.membership[0] : g.membership; return m && ['active','pending_payment'].includes(m.status) && m.start_date <= day && m.end_date >= day })
    })
}

export function familyViewCalendarFilter(scope: NonNullable<Awaited<ReturnType<typeof getFamilyViewScope>>>) {
    const teams = [...new Set([...scope.children.map(c => c.team_id),...scope.groups.map(g => g.team_id)].filter(Boolean))]
    const categories = [...new Set(scope.children.map(c => c.category_id).filter(Boolean))]
    return [
        'and(source_type.eq.manual,team_id.is.null,category_id.is.null)',
        teams.length && `and(source_type.in.(team,manual),team_id.in.(${teams.join(',')}))`,
        categories.length && `and(source_type.in.(team,manual),team_id.is.null,category_id.in.(${categories.join(',')}))`,
        scope.campusIds.length && `and(source_type.eq.campus,source_id.in.(${scope.campusIds.join(',')}))`,
        scope.tournamentIds.length && `and(source_type.eq.tournament,source_id.in.(${scope.tournamentIds.join(',')}))`,
    ].filter(Boolean).join(',')
}
