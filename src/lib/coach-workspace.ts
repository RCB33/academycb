export type SportArea = 'academy' | 'campus' | 'tournament' | 'other'
export const SPORT_AREAS: Record<SportArea, {label:string;className:string}> = {
 academy:{label:'Academy',className:'bg-blue-50 text-blue-800 border-blue-200'},
 campus:{label:'Campus',className:'bg-emerald-50 text-emerald-800 border-emerald-200'},
 tournament:{label:'Torneo',className:'bg-amber-50 text-amber-900 border-amber-200'},
 other:{label:'Agenda interna',className:'bg-slate-100 text-slate-700 border-slate-200'},
}
export type CoachSession = {id:string;title:string;start_date:string;end_date:string;location:string|null;source_type:string;event_type:string;team_id:string|null;teams:{name:string}|null;categories:{name:string}|null;is_all_day:boolean|null;playerCount?:number}
export function sportArea(event:Pick<CoachSession,'source_type'|'event_type'>):SportArea {
 if(event.source_type==='campus'||event.event_type==='campus')return 'campus'
 if(event.source_type==='tournament'||event.event_type==='tournament')return 'tournament'
 if(event.source_type==='team'||event.event_type==='training'||event.event_type==='match')return 'academy'
 return 'other'
}
export function madridDate(date=new Date()){return new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Madrid',year:'numeric',month:'2-digit',day:'2-digit'}).format(date)}
export function shiftDate(date:string,days:number){const d=new Date(`${date}T12:00:00Z`);d.setUTCDate(d.getUTCDate()+days);return d.toISOString().slice(0,10)}
export function validDate(value:unknown,fallback=madridDate()){if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))return fallback;const d=new Date(value+'T12:00:00Z');return Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===value?value:fallback}
export function madridMidnight(date:string){
 const noon=new Date(date+'T12:00:00Z')
 // Determine the offset at midnight, not at noon (DST switches later that day).
 const previous=new Date(Date.parse(date+'T00:00:00Z')-3*3600000)
 const hour=Number(new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Madrid',hour:'2-digit',hourCycle:'h23'}).format(previous))
 const offset=(hour-previous.getUTCHours()+24)%24
 return new Date(Date.parse(noon.toISOString().slice(0,10)+'T00:00:00Z')-offset*3600000).toISOString()
}
export function sessionTime(event:Pick<CoachSession,'start_date'|'end_date'|'is_all_day'>){
 if(event.is_all_day)return 'Todo el día'
 const fmt=new Intl.DateTimeFormat('es-ES',{timeZone:'Europe/Madrid',hour:'2-digit',minute:'2-digit'})
 return `${fmt.format(new Date(event.start_date))} – ${fmt.format(new Date(event.end_date))}`
}
