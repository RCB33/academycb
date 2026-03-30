'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function upsertProduct(data: {
    id?: string;
    name: string;
    description: string;
    price: number;
    stock: number;
    sizes: string[];
    image_url: string;
    is_active: boolean;
}) {
    const supabase = await createClient()

    if (data.id) {
        const { error } = await supabase.from('store_products').update(data).eq('id', data.id)
        if (error) return { success: false, error: error.message }
    } else {
        const { error } = await supabase.from('store_products').insert(data)
        if (error) return { success: false, error: error.message }
    }

    revalidatePath('/admin/tienda')
    revalidatePath('/portal/tienda')
    return { success: true }
}

export async function deleteProduct(id: string) {
    const supabase = await createClient()
    const { error } = await supabase.from('store_products').delete().eq('id', id)
    if (error) return { success: false, error: error.message }

    revalidatePath('/admin/tienda')
    revalidatePath('/portal/tienda')
    return { success: true }
}
