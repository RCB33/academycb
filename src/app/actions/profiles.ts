'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function updateProfile(formData: FormData) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        throw new Error('Not authenticated')
    }

    const full_name = formData.get('full_name') as string

    const { error } = await supabase
        .from('profiles')
        .update({
            full_name,
        })
        .eq('id', user.id)

    if (error) {
        throw new Error(error.message)
    }

    revalidatePath('/portal/profile')
}
