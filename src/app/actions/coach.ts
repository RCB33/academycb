'use server'

import { revalidatePath } from 'next/cache'
import { requireAcademyStaff } from '@/lib/auth'

export async function markAttendance(childId: string, attendance: 'present' | 'absent' | 'excused', sessionDate: string) {
    const { supabase, user } = await requireAcademyStaff()

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
