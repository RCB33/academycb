'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function updateStudentMetrics(childId: string, metrics: {
    pace: number,
    shooting: number,
    passing: number,
    dribbling: number,
    defending: number,
    physical: number,
    discipline?: number
}) {
    const supabase = await createClient()

    // We insert a new record to keep history, or update the latest one for the same day
    const today = new Date().toISOString().split('T')[0]

    const { data: existing } = await supabase
        .from('child_metrics')
        .select('id')
        .eq('child_id', childId)
        .eq('recorded_at', today)
        .limit(1)
        .maybeSingle()

    let error;

    if (existing) {
        const { error: updateError } = await supabase
            .from('child_metrics')
            .update({
                ...metrics,
                recorded_at: today
            })
            .eq('id', existing.id)
        error = updateError
    } else {
        const { error: insertError } = await supabase
            .from('child_metrics')
            .insert({
                child_id: childId,
                recorded_at: today,
                ...metrics
            })
        error = insertError
    }

    if (error) {
        console.error('Error updating metrics:', error)
        return { success: false, error: error.message }
    }

    revalidatePath(`/admin/crm/alumnos/${childId}`)
    return { success: true }
}
