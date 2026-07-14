'use server'

import { revalidatePath } from 'next/cache'
import { requireUser } from '@/lib/auth'

export async function updateProfile(formData: FormData) {
    const { supabase, user } = await requireUser()

    const full_name = String(formData.get('full_name') || '').trim()
    const phone = String(formData.get('phone') || '').trim()
    if (full_name.length < 2 || full_name.length > 120 || phone.length > 30) {
        throw new Error('Datos de perfil no válidos')
    }

    const { error } = await supabase
        .from('profiles')
        .update({
            full_name,
        })
        .eq('id', user.id)

    if (error) {
        throw new Error(error.message)
    }

    const { error: guardianError } = await supabase
        .from('guardians')
        .update({ phone })
        .eq('user_id', user.id)

    if (guardianError) throw new Error(guardianError.message)

    revalidatePath('/portal/profile')
}
