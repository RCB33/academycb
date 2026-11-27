import { academyQuote, offerCampusPrice, offerTournamentQuote, type AcademyOffer, type CampusOffer, type TournamentOffer } from '@/lib/offering'

export type CombinedPlayer = {
    child_name: string; birth_date: string; linked_child_id: string
    academy?: Record<string, string>
    campus?: Record<string, unknown>
    tournament?: Record<string, unknown>
}
export type CombinedPayload = {
    request_id: string; guardian_name: string; email: string; phone: string; notes: string
    privacy_consent: boolean; terms_consent: boolean; website: string; children: CombinedPlayer[]
}

export function combinedFormData(fd: FormData, ids: number[], requestId: string): CombinedPayload {
    const str = (key: string) => String(fd.get(key) || '')
    return {
        request_id: requestId, guardian_name: str('guardian_name'), email: str('email'), phone: str('phone'), notes: str('notes'), website: str('website'),
        privacy_consent: fd.has('privacy_consent'), terms_consent: fd.has('terms_consent'),
        children: ids.map(id => {
            const p = `player_${id}_`, get = (key: string) => str(p + key)
            const fields = (keys: string[]) => Object.fromEntries(keys.map(key => [key, get(key)]))
            return {
                child_name: get('child_name'), birth_date: get('birth_date'), linked_child_id: get('linked_child_id'),
                ...(fd.has(p + 'academy') ? { academy: fields(['plan_id','group_id','second_group_id','start_date','plus','offer_version','payment_choice']) } : {}),
                ...(fd.has(p + 'campus') ? { campus: {
                    ...Object.fromEntries(['payment_choice','campus_id','offer_version','team','role','allergies','health_card','medical_consent','sibling_name','preferences','size','image_consent','reason','expectations'].map(k => [k, get('campus_' + k)])),
                    weeks: fd.getAll(p + 'campus_weeks').map(String), sibling: fd.has(p + 'campus_sibling'),
                    health_consent: fd.has(p + 'campus_health_consent'), payment_consent: fd.has(p + 'campus_payment_consent'), terms_consent: fd.has(p + 'campus_terms_consent'),
                } } : {}),
                ...(fd.has(p + 'tournament') ? { tournament: {
                    ...Object.fromEntries(['payment_choice','offer_version','club','coach','category','level','shirt_size','shorts_size','socks_size'].map(k => [k, get('tournament_' + k)])),
                    tournaments: fd.getAll(p + 'tournament_ids').map(String), owns_kit: get('tournament_owns_kit') === 'yes',
                    champions_clothing: fd.has(p + 'tournament_champions_clothing'), image_consent: get('tournament_image_consent') === 'yes',
                    participation_consent: fd.has(p + 'tournament_participation_consent'),
                } } : {}),
            }
        }),
    }
}

export function combinedQuote(children: CombinedPlayer[], academy: AcademyOffer, campuses: CampusOffer[], tournaments: TournamentOffer) {
    let complete = children.length > 0
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Madrid' })
    const requiresHistoryReview = children.some(c => c.academy?.start_date && c.academy.start_date < today)
    const lines: { player: string; activity: string; amount: number }[] = []
    const monthly: { player: string; amount: number; count: number; until: string }[] = []
    for (const child of children) {
        const player = child.child_name || 'Jugador'
        if (!child.academy && !child.campus && !child.tournament) complete = false
        if (child.academy) {
            const a = child.academy, plan = academy.plans.find(p => p.id === a.plan_id)
            try {
                if (!plan || !a.start_date || !a.group_id || (plan.sessions_per_week === 2 && !a.second_group_id)) throw Error('incomplete')
                const q = academyQuote(plan, a.start_date, a.plus === 'yes')
                lines.push({ player, activity: 'Academia · primer mes, matrícula y extras', amount: q.first_total })
                if (q.remaining.length) monthly.push({ player, amount: q.monthly_price, count: q.remaining.length, until: q.season_end })
            } catch { complete = false }
        }
        if (child.campus) {
            const campus = campuses.find(c => c.id === child.campus!.campus_id)
            try {
                if (!campus) throw Error('incomplete')
                lines.push({ player, activity: campus.name, amount: offerCampusPrice(child.campus.weeks as string[], campus.public_program) })
            } catch { complete = false }
        }
        if (child.tournament) {
            try {
                const q = offerTournamentQuote(child.tournament.tournaments as string[], child.tournament.owns_kit === true, tournaments)
                lines.push({ player, activity: q.kit ? 'Torneos y equipación' : 'Torneos', amount: q.total })
            } catch { complete = false }
        }
    }
    return { complete, requiresHistoryReview, lines, monthly, initial: lines.reduce((n,l) => n + Math.round(l.amount * 100), 0) / 100 }
}
