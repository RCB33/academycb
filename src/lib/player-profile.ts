import { z } from 'zod'
export const CLUB_CATEGORIES = ['Escoleta','S7','S8','S9','S10','S11','S12','S13','S14','S15','S16'] as const
export const CLUB_DIVISIONS = ['Primera División','Segunda División','Preferente','División de Honor'] as const
export const playerProfileSchema = z.object({
    birth_date: z.union([z.literal(''),z.string().date()]),
    club_name: z.string().trim().max(120),
    club_category: z.union([z.literal(''),z.enum(CLUB_CATEGORIES)]),
    club_division: z.union([z.literal(''),z.enum(CLUB_DIVISIONS)]),
}).strict()
export type PlayerProfile = {
    id:string;full_name:string;birth_date?:string|null;birth_year?:number|null;
    club_name?:string|null;club_category?:string|null;club_division?:string|null;
}
export function playerBirthLabel(player: Pick<PlayerProfile,'birth_date'|'birth_year'>,locale='es') {
    if(player.birth_date && /^\d{4}-\d{2}-\d{2}$/.test(player.birth_date)) {
        const date=new Date(`${player.birth_date}T12:00:00Z`)
        if(!Number.isNaN(date.getTime()) && date.toISOString().slice(0,10)===player.birth_date) return date.toLocaleDateString(locale,{month:'long',year:'numeric',timeZone:'UTC'})
    }
    return player.birth_year ? String(player.birth_year) : null
}
