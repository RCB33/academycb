export type PortalUsageRow = {
    id: string
    full_name: string
    email: string | null
    user_id: string | null
    role: string | null
    players: { id: string; full_name: string }[]
    first_seen_at: string | null
    last_seen_at: string | null
    duplicateEmail: boolean
    monthlyCardStatus?: string
    unlinkedAccount?: boolean
}

export type PortalUsageFilter = 'all' | 'accounts' | 'visited' | 'pending' | 'no-account' | 'review'

export function needsPortalReview(row: PortalUsageRow) {
    return row.duplicateEmail || (Boolean(row.user_id) && row.role !== 'guardian') || row.players.length === 0
}

export function filterPortalUsage(rows: PortalUsageRow[], filter: PortalUsageFilter, query: string) {
    const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    const needle = normalize(query.trim())
    return rows.filter(row => {
        const familyAccount = Boolean(row.user_id) && row.role === 'guardian'
        if (filter === 'accounts' && !familyAccount) return false
        if (filter === 'visited' && !(familyAccount && row.first_seen_at)) return false
        if (filter === 'pending' && !(familyAccount && !row.first_seen_at)) return false
        if (filter === 'no-account' && familyAccount) return false
        if (filter === 'review' && !needsPortalReview(row)) return false
        return normalize([row.full_name, row.email || '', ...row.players.map(player => player.full_name)].join(' ')).includes(needle)
    })
}

export function portalUsageSummary(rows: PortalUsageRow[]) {
    const family = rows.filter(row => row.user_id && row.role === 'guardian')
    const visited = family.filter(row => row.first_seen_at)
    const accounts = new Set(family.map(row => row.user_id)).size
    const visits = new Set(visited.map(row => row.user_id)).size
    return { total: rows.length, accounts, visited: visits, pending: accounts - visits, noAccount: rows.length - family.length }
}
