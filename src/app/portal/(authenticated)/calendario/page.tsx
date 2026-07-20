import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { MonthlyCalendar, CalendarEvent } from '@/components/ui/monthly-calendar'

export const dynamic = 'force-dynamic'

export default async function FamilyCalendarPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/')
    }

    // 1. Get the profile of the guardian
    const { data: guardian } = await supabase
        .from('guardians')
        .select('id')
        .eq('user_id', user.id)
        .single()

    // 2. Find children linked to this guardian
    const { data: childrenLinks } = await supabase
        .from('child_guardians')
        .select('child_id')
        .eq('guardian_id', guardian?.id)

    const childIds = childrenLinks?.map(link => link.child_id) || []

    // 3. RLS returns only family-visible events related to the guardian's
    // children (team, campus, tournament or general family event).
    let events: CalendarEvent[] = []
    if (childIds.length > 0) {
        const rangeStart = new Date()
        rangeStart.setMonth(rangeStart.getMonth() - 6)
        const rangeEnd = new Date()
        rangeEnd.setMonth(rangeEnd.getMonth() + 18)
        const { data: rawEvents } = await supabase
            .from('calendar_events')
            .select('*, categories(name), teams(name)')
            .eq('visibility', 'families')
            .neq('status', 'cancelled')
            .lt('start_date', rangeEnd.toISOString())
            .gt('end_date', rangeStart.toISOString())
            .order('start_date', { ascending: true })

        events = (rawEvents || []).map((event) => ({
            id: event.id,
            title: event.title,
            start_date: event.start_date,
            end_date: event.end_date,
            is_all_day: event.is_all_day,
            color: event.color,
            location: event.location,
            category_name: event.teams?.name || event.categories?.name,
        }))
    }

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            <div className="flex flex-col gap-1">
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-navy">Calendario de Actividades</h1>
                <p className="text-muted-foreground text-sm">
                    Visualiza los próximos entrenamientos y partidos de tus hijos.
                </p>
            </div>

            {childIds.length === 0 ? (
                <div className="bg-white p-8 text-center rounded-xl border border-dashed text-slate-500">
                    No tienes alumnos vinculados actualmente, por lo que el calendario está vacío.
                </div>
            ) : events.length === 0 ? (
                <div className="bg-white p-8 text-center rounded-xl border border-dashed text-slate-500">
                    No hay actividades publicadas para tu familia en este periodo.
                </div>
            ) : (
                <div className="bg-white p-4 md:p-6 rounded-xl border shadow-sm">
                    <MonthlyCalendar events={events} />
                </div>
            )}
        </div>
    )
}
