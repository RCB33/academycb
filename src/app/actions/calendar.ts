'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

const EventSchema = z.object({
    title: z.string().min(1, "El título es obligatorio"),
    description: z.string().optional(),
    start_date: z.string(), // ISO string
    end_date: z.string(),   // ISO string
    color: z.string().default('blue'),
    is_all_day: z.boolean().default(true),
    worker_id: z.string().optional().nullable(), // UUID of the worker
    category_id: z.string().optional().nullable(), // UUID of the team
    location: z.string().optional().nullable()
})

export async function createEvent(data: z.infer<typeof EventSchema>) {
    const supabase = await createClient()

    // Check auth
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: "No autorizado" }

    const validated = EventSchema.safeParse(data)
    if (!validated.success) {
        return { success: false, error: "Datos inválidos" }
    }

    try {
        const { error } = await supabase
            .from('calendar_events')
            .insert({
                ...validated.data,
                created_by: user.id
            })

        if (error) throw error

        revalidatePath('/admin/dashboard')
        return { success: true }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
}

export async function getWorkers() {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('workers')
        .select('*')
        .order('full_name', { ascending: true })

    if (error) {
        console.error('Error fetching workers:', error)
        return []
    }

    return data
}

export async function getEvents(startDate: Date, endDate: Date) {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('calendar_events')
        .select(`
            *,
            workers (
                full_name,
                color
            ),
            categories (
                name
            )
        `) // Join with workers and categories
        .gte('start_date', startDate.toISOString())
        .lte('end_date', endDate.toISOString())
        .order('start_date', { ascending: true })

    if (error) {
        console.error('Error fetching events:', error)
        return []
    }

    return data
}

export async function deleteEvent(id: string) {
    const supabase = await createClient()

    try {
        const { error } = await supabase
            .from('calendar_events')
            .delete()
            .eq('id', id)

        if (error) throw error

        revalidatePath('/admin/dashboard')
        return { success: true }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
}
