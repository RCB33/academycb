'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function getCoachNotes(childId: string) {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('coach_notes')
        .select('*')
        .eq('child_id', childId)
        .order('note_date', { ascending: true })
        .order('created_at', { ascending: true })

    if (error) {
        console.error("Error fetching notes:", error)
        return []
    }
    return data
}

export async function createCoachNote(childId: string, data: { title: string, content: string, note_date: string }) {
    const supabase = await createClient()
    const { error } = await supabase
        .from('coach_notes')
        .insert({
            child_id: childId,
            title: data.title,
            content: data.content,
            note_date: data.note_date
        })

    if (error) return { success: false, error: error.message }

    revalidatePath(`/admin/crm/alumnos/${childId}`)
    return { success: true }
}

export async function updateCoachNote(noteId: string, childId: string, data: { title: string, content: string }) {
    const supabase = await createClient()
    const { error } = await supabase
        .from('coach_notes')
        .update({
            title: data.title,
            content: data.content
        })
        .eq('id', noteId)

    if (error) return { success: false, error: error.message }

    revalidatePath(`/admin/crm/alumnos/${childId}`)
    return { success: true }
}

export async function deleteCoachNote(noteId: string, childId: string) {
    const supabase = await createClient()
    const { error } = await supabase
        .from('coach_notes')
        .delete()
        .eq('id', noteId)

    if (error) return { success: false, error: error.message }

    revalidatePath(`/admin/crm/alumnos/${childId}`)
    return { success: true }
}
