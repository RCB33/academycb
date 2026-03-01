'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function markAttendance(childId: string, attendance: 'present' | 'absent' | 'excused', sessionDate: string) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    // Find if record exists
    const { data: existing } = await supabase
        .from('training_sessions')
        .select('id')
        .eq('child_id', childId)
        .eq('session_date', sessionDate)
        .single()

    if (existing) {
        const { error } = await supabase
            .from('training_sessions')
            .update({ attendance, created_by: user.id })
            .eq('id', existing.id)
        if (error) {
            console.error(error)
            throw new Error(error.message)
        }
    } else {
        const { error } = await supabase
            .from('training_sessions')
            .insert({
                child_id: childId,
                session_date: sessionDate,
                attendance,
                created_by: user.id
            })
        if (error) {
            console.error(error)
            throw new Error(error.message)
        }
    }

    revalidatePath('/coach/session/[id]', 'page')
    return { success: true }
}
