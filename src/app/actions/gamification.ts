'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function toggleAchievement(childId: string, achievementId: string) {
    const supabase = await createClient()

    // Check if exists
    const { data: existing } = await supabase
        .from('child_achievements')
        .select('*')
        .eq('child_id', childId)
        .eq('achievement_id', achievementId)
        .single()

    if (existing) {
        // Delete
        const { error } = await supabase
            .from('child_achievements')
            .delete()
            .eq('child_id', childId)
            .eq('achievement_id', achievementId)

        if (error) return { success: false, error: error.message }
        revalidatePath(`/admin/crm/alumnos/${childId}`)
        return { success: true, action: 'removed' }
    } else {
        // Insert
        const { error } = await supabase
            .from('child_achievements')
            .insert({ child_id: childId, achievement_id: achievementId })

        if (error) return { success: false, error: error.message }
        revalidatePath(`/admin/crm/alumnos/${childId}`)
        return { success: true, action: 'added' }
    }
}

export async function createAchievement(data: { name: string, description: string, icon: string }) {
    const supabase = await createClient()
    const { error } = await supabase.from('achievements').insert(data)

    if (error) return { success: false, error: error.message }

    revalidatePath('/admin/crm/alumnos')
    return { success: true }
}

export async function deleteAchievement(id: string) {
    const supabase = await createClient()
    const { error } = await supabase.from('achievements').delete().eq('id', id)

    if (error) return { success: false, error: error.message }

    revalidatePath('/admin/crm/alumnos')
    return { success: true }
}
