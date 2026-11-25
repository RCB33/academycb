import 'server-only'
import { createClient } from '@/lib/supabase/server'
import { getTournamentPricing } from '@/lib/tournament-pricing'
import { createHash } from 'node:crypto'
import type { TravelTournamentOffer } from './travel-tournament'

export async function getTravelTournamentOffer(id: string): Promise<TravelTournamentOffer | null> {
    const db = await createClient()
    const { data, error } = await db.from('tournaments_internal').select('id,title,start_date,end_date,price,status').eq('id', id).eq('status', 'open').maybeSingle()
    if (error) throw new Error('No se pudo consultar el torneo. Inténtalo de nuevo.')
    if (!data?.start_date || !data.end_date || data.end_date < new Date().toISOString().slice(0, 10)) return null
    const pricing = getTournamentPricing(id, data.price)
    if (!pricing) return null
    return { ...data, price: Number(data.price), version: createHash('sha256').update(JSON.stringify({ data, pricing })).digest('hex') }
}
