import { z } from 'zod'
export const EVALUATION_FIELDS = [
    ['pace','Velocidad'], ['shooting','Tiro'], ['passing','Pase'], ['dribbling','Regate'],
    ['defending','Defensa'], ['physical','Físico'], ['discipline','Disciplina'],
] as const
const score = z.number().int().min(0).max(99)
export const evaluationSchema = z.object({
    pace:score, shooting:score, passing:score, dribbling:score, defending:score, physical:score,
    discipline:score.optional(), recorded_at:z.string().date().optional(), visible_to_guardian:z.boolean().optional(),
}).strict()
export type PlayerEvaluation = { recorded_at:string;visible_to_guardian:boolean } & Record<typeof EVALUATION_FIELDS[number][0],number>
export function madridToday() { return new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Madrid',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date()) }
