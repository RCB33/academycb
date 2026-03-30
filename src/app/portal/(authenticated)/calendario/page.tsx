import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { MonthlyCalendar, CalendarEvent } from '@/components/ui/monthly-calendar'
import { CalendarDays } from 'lucide-react'

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

    let categoryIds: string[] = []

    if (childIds.length > 0) {
        // Fetch children to get their assigned categories
        const { data: children } = await supabase
            .from('children')
            .select('category_id')
            .in('id', childIds)

        categoryIds = children?.map(c => c.category_id).filter(Boolean) || []
    }

    // 3. Fetch events for those categories
    let events: CalendarEvent[] = []

    if (categoryIds.length > 0) {
        const { data: rawEvents } = await supabase
            .from('calendar_events')
            .select('*, categories(name)')
            .in('category_id', categoryIds)
            .order('start_date', { ascending: true })

        events = (rawEvents || []).map((e: any) => ({
            id: e.id,
            title: e.title,
            start_date: e.start_date,
            end_date: e.end_date,
            color: e.color,
            location: e.location,
            category_name: e.categories?.name,
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

            {categoryIds.length === 0 ? (
                <div className="bg-white p-8 text-center rounded-xl border border-dashed text-slate-500">
                    No tienes hijos asignados a ninguna categoría actualmente, por lo que el calendario está vacío.
                </div>
            ) : (
                <div className="bg-white p-4 md:p-6 rounded-xl border shadow-sm">
                    <MonthlyCalendar events={events} />
                </div>
            )}
        </div>
    )
}
