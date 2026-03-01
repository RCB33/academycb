'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function getGuardians() {
    const supabase = await createClient()

    const { data: guardians, error } = await supabase
        .from('guardians')
        .select(`
            *,
            children:child_guardians(
                child:children(
                    id, 
                    full_name, 
                    category:categories(name)
                )
            )
        `)
        .order('full_name')

    if (error) {
        console.error('Error fetching guardians:', error)
        return []
    }

    return guardians
}

export async function getGuardianById(id: string) {
    const supabase = await createClient()

    const { data: guardian, error } = await supabase
        .from('guardians')
        .select(`
            *,
            children:child_guardians(
                child:children(
                    id, 
                    full_name, 
                    birth_year,
                    category:categories(name)
                ),
                relationship,
                is_primary
            )
        `)
        .eq('id', id)
        .single()

    if (error) {
        console.error('Error fetching guardian by id:', error)
        return null
    }

    return guardian
}

export async function createGuardian(data: { full_name: string; email: string; phone: string; notes?: string }) {
    const supabase = await createClient()

    const { data: newGuardian, error } = await supabase
        .from('guardians')
        .insert({
            full_name: data.full_name,
            email: data.email || null,
            phone: data.phone || '',
            notes: data.notes || null
        })
        .select()
        .single()

    if (error) {
        return { success: false, error: error.message }
    }

    revalidatePath('/admin/crm/tutores')
    return { success: true, guardian: newGuardian }
}

export async function updateGuardian(id: string, data: { full_name: string; email: string; phone: string; notes?: string }) {
    const supabase = await createClient()

    const { error } = await supabase
        .from('guardians')
        .update({
            full_name: data.full_name,
            email: data.email || null,
            phone: data.phone || '',
            notes: data.notes || null
        })
        .eq('id', id)

    if (error) {
        return { success: false, error: error.message }
    }

    revalidatePath('/admin/crm/tutores')
    revalidatePath(`/admin/crm/tutores/${id}`)
    return { success: true }
}

export async function deleteGuardian(id: string) {
    const supabase = await createClient()

    const { error } = await supabase
        .from('guardians')
        .delete()
        .eq('id', id)

    if (error) {
        return { success: false, error: error.message }
    }

    revalidatePath('/admin/crm/tutores')
    return { success: true }
}
