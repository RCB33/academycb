import Link from 'next/link'
import { CalendarDays, Clock3, MapPin, Users } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent } from '@/components/ui/card'

export const dynamic = 'force-dynamic'

function relatedName(value: { name?: string | null } | Array<{ name?: string | null }> | null) {
    return Array.isArray(value) ? value[0]?.name : value?.name
}

export default async function CoachCalendarPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    let worker: { id: string; full_name: string } | null = null
    if (user) {
        const { data } = await supabase.from('workers').select('id, full_name').eq('user_id', user.id).maybeSingle()
        worker = data
        if (!worker && user.email) {
            const { data: byEmail } = await supabase.from('workers').select('id, full_name').ilike('email', user.email).maybeSingle()
            worker = byEmail
        }
    }
    const { data: assignments } = worker ? await supabase.from('calendar_event_workers').select('event_id').eq('worker_id', worker.id) : { data: [] }
    const assignedIds = new Set((assignments || []).map((item) => item.event_id))
    const rangeStart = new Date(); rangeStart.setDate(rangeStart.getDate() - 1)
    const rangeEnd = new Date(); rangeEnd.setDate(rangeEnd.getDate() + 60)
    const { data: rawEvents } = worker ? await supabase.from('calendar_events').select('id,title,start_date,end_date,location,worker_id,teams(name),categories(name)').gte('start_date', rangeStart.toISOString()).lt('start_date', rangeEnd.toISOString()).neq('status', 'cancelled').order('start_date') : { data: [] }
    const events = (rawEvents || []).filter((event) => event.worker_id === worker?.id || assignedIds.has(event.id))

    return <div className="mx-auto max-w-4xl space-y-6 p-4 sm:p-6 md:p-8">
        <header className="relative overflow-hidden rounded-3xl bg-navy p-6 text-white shadow-lg"><div className="absolute -right-12 -top-16 h-40 w-40 rounded-full border border-gold/20" /><div className="relative flex gap-4"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gold text-navy"><CalendarDays className="h-6 w-6" /></span><div><p className="text-[10px] font-black uppercase tracking-[0.18em] text-gold">Equipo técnico</p><h1 className="mt-1 font-heading text-3xl font-black uppercase">Mi calendario</h1><p className="mt-2 text-sm text-slate-300">Tus sesiones asignadas para los próximos 60 días.</p></div></div></header>
        {!worker ? <Card className="border-amber-200 bg-amber-50"><CardContent className="p-6 text-sm font-medium text-amber-800">Tu acceso todavía no está vinculado a una ficha de trabajador.</CardContent></Card> : events.length === 0 ? <Card className="border-dashed"><CardContent className="flex min-h-48 flex-col items-center justify-center p-8 text-center"><CalendarDays className="h-10 w-10 text-slate-300" /><p className="mt-4 font-bold text-navy">No tienes próximas sesiones asignadas</p><p className="mt-1 text-sm text-slate-500">Cuando coordinación actualice el calendario aparecerán aquí.</p></CardContent></Card> : <div className="space-y-3">{events.map((event) => <Link key={event.id} href={`/coach/session/${event.id}`} className="block"><Card className="border-slate-200 shadow-sm transition hover:-translate-y-0.5 hover:border-gold/50 hover:shadow-md"><CardContent className="flex items-start gap-4 p-5"><span className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-2xl bg-gold text-navy"><strong className="text-lg leading-none">{new Date(event.start_date).getDate()}</strong><span className="text-[9px] font-black uppercase">{new Date(event.start_date).toLocaleDateString('es-ES', { month: 'short' })}</span></span><div className="min-w-0 flex-1"><h2 className="font-bold text-navy">{event.title}</h2><div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500"><span className="flex items-center gap-1"><Clock3 className="h-3.5 w-3.5 text-gold" />{new Date(event.start_date).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</span>{event.location && <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5 text-gold" />{event.location}</span>}<span className="flex items-center gap-1"><Users className="h-3.5 w-3.5 text-gold" />{relatedName(event.teams) || relatedName(event.categories) || 'Academy'}</span></div></div></CardContent></Card></Link>)}</div>}
    </div>
}
