'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import type { SupabaseClient } from '@supabase/supabase-js'
import { requireCalendarAccess } from '@/lib/auth'

const EventTypeSchema = z.enum(['general', 'training', 'match', 'meeting', 'campus', 'tournament', 'absence'])
const EventStatusSchema = z.enum(['confirmed', 'tentative', 'cancelled'])
const EventVisibilitySchema = z.enum(['internal', 'families'])

const EventSchema = z.object({
    title: z.string().trim().min(2, 'El título es obligatorio').max(160),
    description: z.string().trim().max(1000).optional().default(''),
    start_date: z.string().datetime({ offset: true }),
    end_date: z.string().datetime({ offset: true }),
    color: z.string().trim().min(1).max(20).default('#3b82f6'),
    is_all_day: z.boolean().default(false),
    worker_ids: z.array(z.string().uuid()).max(20).default([]),
    category_id: z.string().uuid().optional().nullable(),
    team_id: z.string().uuid().optional().nullable(),
    location: z.string().trim().max(200).optional().nullable(),
    event_type: EventTypeSchema.default('general'),
    status: EventStatusSchema.default('confirmed'),
    visibility: EventVisibilitySchema.default('internal'),
}).refine((value) => new Date(value.end_date) > new Date(value.start_date), {
    message: 'La fecha de fin debe ser posterior al inicio',
    path: ['end_date'],
})

const DateRangeSchema = z.object({
    start: z.string().datetime({ offset: true }),
    end: z.string().datetime({ offset: true }),
}).refine((value) => new Date(value.end) > new Date(value.start))

export type CalendarEventType = z.infer<typeof EventTypeSchema>
export type CalendarEventStatus = z.infer<typeof EventStatusSchema>
export type CalendarEventVisibility = z.infer<typeof EventVisibilitySchema>

export type CalendarWorker = {
    id: string
    full_name: string
    position: string | null
    color: string | null
    avatar_url: string | null
}

export type CalendarCategory = { id: string; name: string }

export type CalendarTeam = {
    id: string
    name: string
    category_id: string | null
    coach_id: string | null
    category: CalendarCategory | null
}

export type CalendarEvent = {
    id: string
    title: string
    description: string | null
    start_date: string
    end_date: string
    color: string
    is_all_day: boolean
    worker_id: string | null
    worker_ids: string[]
    workers: CalendarWorker[]
    category_id: string | null
    team_id: string | null
    category: CalendarCategory | null
    team: { id: string; name: string } | null
    location: string | null
    event_type: CalendarEventType
    status: CalendarEventStatus
    visibility: CalendarEventVisibility
    source_type: 'manual' | 'team' | 'campus' | 'tournament'
    source_id: string | null
}

type RawEvent = Omit<CalendarEvent, 'worker_ids' | 'workers' | 'category' | 'team'> & {
    workers: CalendarWorker | null
    categories: CalendarCategory | null
    teams: { id: string; name: string } | null
    event_workers: Array<{ worker_id: string; worker: CalendarWorker | null }> | null
}

function refreshCalendarPaths() {
    revalidatePath('/admin/calendario')
    revalidatePath('/admin/dashboard')
    revalidatePath('/coach')
    revalidatePath('/portal/calendario')
}

function normalizeEvent(row: RawEvent): CalendarEvent {
    const assignedWorkers = (row.event_workers || [])
        .map((assignment) => assignment.worker)
        .filter((worker): worker is CalendarWorker => Boolean(worker))

    if (assignedWorkers.length === 0 && row.workers) assignedWorkers.push(row.workers)

    return {
        id: row.id,
        title: row.title,
        description: row.description,
        start_date: row.start_date,
        end_date: row.end_date,
        color: row.color,
        is_all_day: row.is_all_day,
        worker_id: row.worker_id,
        worker_ids: assignedWorkers.map((worker) => worker.id),
        workers: assignedWorkers,
        category_id: row.category_id,
        team_id: row.team_id,
        category: row.categories,
        team: row.teams,
        location: row.location,
        event_type: row.event_type,
        status: row.status,
        visibility: row.visibility,
        source_type: row.source_type,
        source_id: row.source_id,
    }
}

export async function getCalendarLookups(): Promise<{
    workers: CalendarWorker[]
    categories: CalendarCategory[]
    teams: CalendarTeam[]
}> {
    const { supabase } = await requireCalendarAccess()
    const [workersResult, categoriesResult, teamsResult] = await Promise.all([
        supabase.from('workers').select('id, full_name, position, color, avatar_url').order('full_name'),
        supabase.from('categories').select('id, name').order('name'),
        supabase.from('teams').select('id, name, category_id, coach_id, category:categories(id, name)').eq('status', 'active').order('name'),
    ])

    if (workersResult.error || categoriesResult.error || teamsResult.error) {
        console.error('Calendar lookups failed:', workersResult.error || categoriesResult.error || teamsResult.error)
    }

    return {
        workers: (workersResult.data || []) as CalendarWorker[],
        categories: (categoriesResult.data || []) as CalendarCategory[],
        teams: (teamsResult.data || []) as unknown as CalendarTeam[],
    }
}

export async function getEvents(startInput: string, endInput: string): Promise<CalendarEvent[]> {
    const range = DateRangeSchema.safeParse({ start: startInput, end: endInput })
    if (!range.success) return []

    const { supabase } = await requireCalendarAccess()
    const { data, error } = await supabase
        .from('calendar_events')
        .select(`
            id, title, description, start_date, end_date, color, is_all_day,
            worker_id, category_id, team_id, location, event_type, status,
            visibility, source_type, source_id,
            workers(id, full_name, position, color, avatar_url),
            categories(id, name),
            teams(id, name),
            event_workers:calendar_event_workers(
                worker_id,
                worker:workers(id, full_name, position, color, avatar_url)
            )
        `)
        .lt('start_date', range.data.end)
        .gt('end_date', range.data.start)
        .order('start_date', { ascending: true })

    if (error) {
        console.error('Error fetching calendar events:', error)
        return []
    }

    return (data || []).map((row) => normalizeEvent(row as unknown as RawEvent))
}

async function findWorkerConflicts(
    supabase: SupabaseClient,
    workerIds: string[],
    startDate: string,
    endDate: string,
    excludedEventId?: string,
) {
    if (workerIds.length === 0) return []

    const { data: assignments } = await supabase
        .from('calendar_event_workers')
        .select('event_id, worker_id, worker:workers(full_name)')
        .in('worker_id', workerIds)

    const eventIds = [...new Set((assignments || []).map((item) => item.event_id))]
        .filter((id) => id !== excludedEventId)
    if (eventIds.length === 0) return []

    const { data: overlaps } = await supabase
        .from('calendar_events')
        .select('id, title')
        .in('id', eventIds)
        .neq('status', 'cancelled')
        .lt('start_date', endDate)
        .gt('end_date', startDate)

    const overlappingIds = new Set((overlaps || []).map((event) => event.id))
    const eventNames = new Map((overlaps || []).map((event) => [event.id, event.title]))

    return (assignments || [])
        .filter((assignment) => overlappingIds.has(assignment.event_id))
        .map((assignment) => {
            const worker = assignment.worker as unknown as { full_name: string } | null
            return `${worker?.full_name || 'Trabajador'} ya tiene “${eventNames.get(assignment.event_id) || 'otro evento'}”`
        })
        .filter((warning, index, warnings) => warnings.indexOf(warning) === index)
}

async function replaceEventWorkers(supabase: SupabaseClient, eventId: string, workerIds: string[]) {
    const { error: deleteError } = await supabase.from('calendar_event_workers').delete().eq('event_id', eventId)
    if (deleteError) throw deleteError
    if (workerIds.length === 0) return

    const { error: insertError } = await supabase.from('calendar_event_workers').insert(
        workerIds.map((workerId) => ({ event_id: eventId, worker_id: workerId }))
    )
    if (insertError) throw insertError
}

export async function createEvent(input: z.input<typeof EventSchema>) {
    const validated = EventSchema.safeParse(input)
    if (!validated.success) return { success: false, error: validated.error.issues[0]?.message || 'Datos inválidos' }

    const { supabase, user } = await requireCalendarAccess()
    const payload = validated.data
    const warnings = await findWorkerConflicts(supabase, payload.worker_ids, payload.start_date, payload.end_date)

    const { data: event, error } = await supabase
        .from('calendar_events')
        .insert({
            title: payload.title,
            description: payload.description || null,
            start_date: payload.start_date,
            end_date: payload.end_date,
            color: payload.color,
            is_all_day: payload.is_all_day,
            worker_id: payload.worker_ids[0] || null,
            category_id: payload.category_id || null,
            team_id: payload.team_id || null,
            location: payload.location || null,
            event_type: payload.event_type,
            status: payload.status,
            visibility: payload.visibility,
            source_type: 'manual',
            created_by: user.id,
        })
        .select('id')
        .single()

    if (error || !event) {
        console.error('Error creating event:', error)
        return { success: false, error: 'No se pudo crear el evento' }
    }

    try {
        await replaceEventWorkers(supabase, event.id, payload.worker_ids)
    } catch (assignmentError) {
        console.error('Error assigning event workers:', assignmentError)
        await supabase.from('calendar_events').delete().eq('id', event.id)
        return { success: false, error: 'No se pudieron asignar los trabajadores' }
    }

    refreshCalendarPaths()
    return { success: true, warnings }
}

export async function updateEvent(idInput: string, input: z.input<typeof EventSchema>) {
    const parsedId = z.string().uuid().safeParse(idInput)
    const validated = EventSchema.safeParse(input)
    if (!parsedId.success || !validated.success) {
        return { success: false, error: validated.success ? 'Evento no válido' : validated.error.issues[0]?.message || 'Datos inválidos' }
    }

    const { supabase } = await requireCalendarAccess()
    const payload = validated.data
    const warnings = await findWorkerConflicts(supabase, payload.worker_ids, payload.start_date, payload.end_date, parsedId.data)
    const { error } = await supabase
        .from('calendar_events')
        .update({
            title: payload.title,
            description: payload.description || null,
            start_date: payload.start_date,
            end_date: payload.end_date,
            color: payload.color,
            is_all_day: payload.is_all_day,
            worker_id: payload.worker_ids[0] || null,
            category_id: payload.category_id || null,
            team_id: payload.team_id || null,
            location: payload.location || null,
            event_type: payload.event_type,
            status: payload.status,
            visibility: payload.visibility,
            updated_at: new Date().toISOString(),
        })
        .eq('id', parsedId.data)

    if (error) {
        console.error('Error updating event:', error)
        return { success: false, error: 'No se pudo actualizar el evento' }
    }

    try {
        await replaceEventWorkers(supabase, parsedId.data, payload.worker_ids)
    } catch (assignmentError) {
        console.error('Error updating event workers:', assignmentError)
        return { success: false, error: 'El evento se actualizó, pero falló la asignación de trabajadores' }
    }

    refreshCalendarPaths()
    return { success: true, warnings }
}

export async function deleteEvent(idInput: string) {
    const parsedId = z.string().uuid().safeParse(idInput)
    if (!parsedId.success) return { success: false, error: 'Evento no válido' }

    const { supabase } = await requireCalendarAccess()
    const { data: event } = await supabase.from('calendar_events').select('source_type').eq('id', parsedId.data).single()
    if (event?.source_type && event.source_type !== 'manual') {
        return { success: false, error: 'Este evento está sincronizado. Cancélalo o modifica su módulo de origen.' }
    }

    const { error } = await supabase.from('calendar_events').delete().eq('id', parsedId.data)
    if (error) {
        console.error('Error deleting event:', error)
        return { success: false, error: 'No se pudo eliminar el evento' }
    }

    refreshCalendarPaths()
    return { success: true }
}
